// app/api/poker/create/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { createGame } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

/**
 * 🎲 Create a new Poker Game instance
 * - Creates a new DB-backed game with a shuffled deck
 * - Starts with no players, empty communal cards & pot
 * - Returns the new gameId (_id)
 */
export const POST = withAuth(async (request, context, session) => {
  try {
    // Create a fresh game in MongoDB
    const game = await createGame();
    const serialized = serializeGame(game);

    // Notify all connected clients that a new game exists
    await PokerSocketEmitter.emitGameCreated(game);

    return Response.json({
      success: true,
      message: 'New poker game created.',
      gameId: serialized._id,
      game: serialized,
    });
  } catch (error) {
    console.error('Error creating poker game:', error);
    return Response.json(
      { success: false, error: 'Failed to create game.' },
      { status: 500 }
    );
  }
});
