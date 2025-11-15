// app/api/poker/timer/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { PokerGame } from '@/app/poker/lib/models/poker-game';
import {
  startActionTimer,
  pauseActionTimer,
  resumeActionTimer,
  clearActionTimer,
  setTurnTimerAction,
} from '@/app/poker/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { GameActionType } from '@/app/poker/lib/definitions/game-actions';
import { POKER_TIMERS } from '@/app/poker/lib/config/poker-constants';
import { withRateLimit, RATE_LIMITS } from '@/app/lib/api/rate-limiter';

/**
 * Consolidated timer management endpoint
 *
 * Handles all timer operations via action parameter:
 * - start: Start action timer for current player
 * - pause: Pause the running timer
 * - resume: Resume a paused timer
 * - clear: Clear/cancel the timer
 * - set-action: Set the action to execute when timer expires
 *
 * Request body:
 * {
 *   gameId: string,
 *   action: 'start' | 'pause' | 'resume' | 'clear' | 'set-action',
 *   // For set-action only:
 *   timerAction?: 'fold' | 'call' | 'check' | 'bet' | 'raise',
 *   betAmount?: number
 * }
 */
export const POST = withRateLimit(RATE_LIMITS.TIMER, withAuth(async (request, context, session) => {
  try {
    const body = await request.json();
    const { gameId, action, timerAction, betAmount } = body;
    const id = gameId || process.env.DEFAULT_GAME_ID!;

    if (!action) {
      return Response.json(
        { error: 'Action parameter required. Must be one of: start, pause, resume, clear, set-action' },
        { status: 400 }
      );
    }

    // Route to appropriate handler based on action
    switch (action) {
      case 'start': {
        // Get current game state
        const game = await PokerGame.findById(id);
        if (!game) {
          return Response.json({ error: 'Game not found' }, { status: 404 });
        }

        // Check if game is in a valid state to start timer
        if (!game.locked) {
          return Response.json({ error: 'Game is not active' }, { status: 400 });
        }

        // Check if timer is already running
        if (game.actionTimer && !game.actionTimer.isPaused) {
          return Response.json({ error: 'Timer is already running' }, { status: 400 });
        }

        // Determine which player should act next
        const currentPlayerIndex = game.currentPlayerIndex || 0;
        const currentPlayer = game.players[currentPlayerIndex];

        if (!currentPlayer) {
          return Response.json({ error: 'No valid player to start timer for' }, { status: 400 });
        }

        // Start timer for current player
        const updatedGame = await startActionTimer(
          id,
          POKER_TIMERS.ACTION_DURATION_SECONDS,
          GameActionType.PLAYER_BET,
          currentPlayer.id
        );

        return Response.json({
          success: true,
          game: serializeGame(updatedGame),
          message: `Timer started for ${currentPlayer.username}`
        });
      }

      case 'pause': {
        const game = await pauseActionTimer(id);
        return Response.json({ success: true, game: serializeGame(game) });
      }

      case 'resume': {
        const game = await resumeActionTimer(id);
        return Response.json({ success: true, game: serializeGame(game) });
      }

      case 'clear': {
        const game = await clearActionTimer(id);
        return Response.json({ success: true, game: serializeGame(game) });
      }

      case 'set-action': {
        if (!timerAction || !['fold', 'call', 'check', 'bet', 'raise'].includes(timerAction)) {
          return Response.json(
            { error: 'Invalid timerAction. Must be one of: fold, call, check, bet, raise' },
            { status: 400 }
          );
        }

        const game = await setTurnTimerAction(id, session.user.id, timerAction, betAmount);
        return Response.json({ success: true, game: serializeGame(game) });
      }

      default:
        return Response.json(
          { error: `Invalid action: ${action}. Must be one of: start, pause, resume, clear, set-action` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Timer API] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to execute timer action' },
      { status: 500 }
    );
  }
}));
