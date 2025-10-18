// app/api/poker/create/route.ts

import { auth } from '@/app/lib/auth';
import { createGame } from '@/app/lib/server/poker-game-controller';
import { emitViaAPI } from '@/app/api/socket/io';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';

/**
 * 🎲 Create a new Poker Game instance
 * - Creates a new DB-backed game with a shuffled deck
 * - Starts with no players, empty communal cards & pot
 * - Returns the new gameId (_id)
 */
export async function POST() {
  try {
    const session = await auth();

    // Optional: allow guest sessions
    if (!session?.user?.id) {
      console.warn('Guest creating game');
      // In production, you might return 401 or allow anonymous games
    }

    // Create a fresh game in MongoDB
    const game = await createGame();

    // Optionally notify all connected clients that a new game exists
    await emitViaAPI(SOCKET_EVENTS.POKER_GAME_CREATED, game);

    return Response.json({
      success: true,
      message: 'New poker game created.',
      gameId: game._id.toString(),
      game,
    });
  } catch (error) {
    console.error('Error creating poker game:', error);
    return Response.json(
      { success: false, error: 'Failed to create game.' },
      { status: 500 }
    );
  }
}
