// app/api/poker/timer/check/route.ts

import { NextResponse } from 'next/server';
import { PokerGame } from '@/app/lib/models/poker-game';
import { placeBet } from '@/app/lib/server/poker-game-controller';
import { auth } from '@/app/lib/auth';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { validatePlayerExists } from '@/app/lib/utils/player-helpers';

/**
 * Check if timer has expired and execute action if needed
 * This serves as a fallback if the server-side setTimeout fails
 */
export async function POST(request: Request) {
  try {
    const { gameId } = await request.json();

    let game;

    if (gameId) {
      game = await PokerGame.findById(gameId);
    } else {
      // Try to find game by current user's session
      const session = await auth();
      if (session?.user?.id) {
        game = await PokerGame.findOne({ 'players.id': session.user.id });
      }
    }

    if (!game) {
      return NextResponse.json({ error: 'Game not found - no gameId provided and no game found for current user' }, { status: 404 });
    }

    // Check if there's an active timer
    if (!game.actionTimer) {
      return NextResponse.json({ message: 'No active timer' }, { status: 200 });
    }

    if (game.actionTimer.isPaused) {
      return NextResponse.json({ message: 'Timer is paused' }, { status: 200 });
    }

    const { actionType, targetPlayerId, startTime, duration, selectedAction } = game.actionTimer;

    // Check if timer has expired
    const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;

    if (elapsed >= duration - 0.5) { // Small buffer for timing issues

      // Execute the action
      if (actionType === GameActionType.PLAYER_BET && targetPlayerId) {
        try {
          const playerIndex = validatePlayerExists(game.players, targetPlayerId);

          // Calculate current bet to determine default action
          const { calculateCurrentBet } = await import('@/app/lib/utils/betting-helpers');
          const currentBet = calculateCurrentBet(game.playerBets, playerIndex);

          // Default action: 'check' if no bet to call, otherwise 'call' to match the bet
          const defaultAction = currentBet === 0 ? 'check' : 'call';
          const actionToExecute = selectedAction || defaultAction;

          // CRITICAL: Clear timer BEFORE executing to prevent duplicate execution
          // (both server setTimeout and client fallback might trigger)
          game.actionTimer = undefined;
          await game.save();

          const actualGameId = game._id.toString();

          // Calculate bet amount based on selected action
          let betAmount: number;

          switch (actionToExecute) {
            case 'fold':
              const { fold } = await import('@/app/lib/server/poker-game-controller');
              const foldResult = await fold(actualGameId, targetPlayerId);
              await PokerSocketEmitter.emitStateUpdate(foldResult);
              return NextResponse.json({
                message: 'Fold executed by client fallback',
                action: 'fold',
                playerId: targetPlayerId,
                gameId: actualGameId,
              });

            case 'call':
              betAmount = currentBet;
              break;

            case 'check':
              betAmount = 0;
              break;

            case 'raise':
              betAmount = currentBet + 1;
              break;

            case 'bet':
            default:
              betAmount = 1;
              break;
          }

          // Execute bet action
          const result = await placeBet(actualGameId, targetPlayerId, betAmount);

          // Emit socket events to notify all clients of the state change
          await PokerSocketEmitter.emitGameActionResults(result.events);

          return NextResponse.json({
            message: 'Action executed by client fallback',
            action: actionToExecute,
            playerId: targetPlayerId,
            gameId: actualGameId,
            result
          });
        } catch (betError: any) {
          console.error('[Timer Check API] Failed to execute action after retries:', betError.message);
          return NextResponse.json({
            error: 'Failed to execute action',
            message: betError.message,
            playerId: targetPlayerId
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({
          message: 'Unknown action type',
          actionType
        });
      }
    } else {
      return NextResponse.json({
        message: 'Timer not yet expired',
        remainingSeconds: Math.ceil(duration - elapsed),
        elapsed,
        duration
      });
    }

  } catch (error: any) {
    console.error('[Timer Check API] Error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
