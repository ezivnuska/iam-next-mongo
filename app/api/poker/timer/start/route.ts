// app/api/poker/timer/start/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { PokerGame } from '@/app/lib/models/poker-game';
import { startActionTimer } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { GameActionType } from '@/app/lib/definitions/game-actions';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  try {
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

    console.log('[Start Timer API] Starting timer for player:', currentPlayer.username, 'at index:', currentPlayerIndex);

    // Start timer for current player
    const updatedGame = await startActionTimer(
      id,
      10, // 10 second duration
      GameActionType.PLAYER_BET,
      currentPlayer.id
    );

    return Response.json({
      success: true,
      game: serializeGame(updatedGame),
      message: `Timer started for ${currentPlayer.username}`
    });
  } catch (error) {
    console.error('[Start Timer API] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to start timer' },
      { status: 500 }
    );
  }
});
