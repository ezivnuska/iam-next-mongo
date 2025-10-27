// app/api/poker/singleton/route.ts

import { auth } from '@/app/lib/auth';
import { getOrCreateSingletonGame } from '@/app/lib/server/poker/singleton-game';
import { serializeGame } from '@/app/lib/utils/game-serialization';

/**
 * GET /api/poker/singleton
 * Returns the persistent singleton poker game (creates if doesn't exist)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const game = await getOrCreateSingletonGame();
    const serialized = serializeGame(game);

    // Return serialized game directly to match PokerStateUpdatePayload format
    return Response.json({
      game: serialized,
    });
  } catch (error) {
    console.error('Error fetching singleton game:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fetch game'
    }, { status: 500 });
  }
}
