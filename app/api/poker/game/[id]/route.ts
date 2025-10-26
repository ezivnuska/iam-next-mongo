// app/api/poker/game/[id]/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { getGame } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';

export const GET = withAuth(async (
  request,
  { params }: { params: Promise<{ id: string }> },
  session
) => {
  try {
    const { id } = await params;
    const game = await getGame(id);

    if (!game) {
      return Response.json({ error: 'Game not found' }, { status: 404 });
    }

    return Response.json({ game: serializeGame(game) });
  } catch (error) {
    console.error('Error fetching game:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fetch game'
    }, { status: 500 });
  }
});
