// app/api/poker/singleton/route.ts

import { getOrCreateSingletonGame } from '@/app/games/poker/lib/server/game/singleton-game';
import { serializeGame } from '@/app/lib/utils/game-serialization';

/**
 * GET /api/poker/singleton
 * Returns the persistent singleton poker game (creates if doesn't exist)
 */
export async function GET() {
  try {
    // Ensure database connection
    const { connectToDatabase } = await import('@/app/lib/mongoose');
    await connectToDatabase();

    const game = await getOrCreateSingletonGame();
    const serialized = serializeGame(game);

    // Return serialized game directly to match PokerStateUpdatePayload format
    return Response.json({
      game: serialized,
    });
  } catch (error) {
    console.error('Error fetching singleton game:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fetch game'
    }, { status: 500 });
  }
}
