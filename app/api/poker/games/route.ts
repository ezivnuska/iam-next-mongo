// app/api/poker/games/route.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import { requireAuth } from '@/app/lib/utils/auth-utils';

export async function GET() {
  try {
    await requireAuth();
    // Fetch all active games (games that are either waiting for players or currently in progress)
    const games = await PokerGame.find({
      $or: [
        { locked: false, 'players.0': { $exists: true } }, // Games waiting for players
        { locked: true } // Active games
      ]
    }).select('_id code players locked');

    const gameList = games.map(game => ({
      id: game._id.toString(),
      code: game.code,
      playerCount: game.players.length,
      locked: game.locked,
      creatorId: game.players.length > 0 ? game.players[0].id : null
    }));

    return Response.json({ games: gameList });
  } catch (error) {
    console.error('Error fetching games:', error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fetch games'
    }, { status: 500 });
  }
}
