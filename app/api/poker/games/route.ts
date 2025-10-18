// app/api/poker/games/route.ts

import { auth } from '@/app/lib/auth';
import { PokerGame } from '@/app/lib/models/poker-game';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all active games (games that are either waiting for players or currently playing)
    const games = await PokerGame.find({
      $or: [
        { playing: false, 'players.0': { $exists: true } }, // Games waiting for players
        { playing: true } // Active games
      ]
    }).select('_id code players playing');

    const gameList = games.map(game => ({
      id: game._id.toString(),
      code: game.code,
      playerCount: game.players.length,
      playing: game.playing,
      creatorId: game.players.length > 0 ? game.players[0].id : null
    }));

    return Response.json({ games: gameList });
  } catch (error) {
    console.error('Error fetching games:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to fetch games'
    }, { status: 500 });
  }
}
