// app/api/poker/heartbeat/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { PokerGame } from '@/app/poker/lib/models/poker-game';

/**
 * Player heartbeat endpoint
 *
 * Tracks when players were last active to detect disconnections
 * Updates lastHeartbeat timestamp for the player in the game
 */
export const POST = withAuth(async (request, context, session) => {
  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return Response.json(
        { error: 'Game ID required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Update player's last heartbeat time
    const result = await PokerGame.updateOne(
      {
        code: gameId,
        'players.id': userId,
      },
      {
        $set: {
          'players.$.lastHeartbeat': new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return Response.json(
        { error: 'Player not found in game' },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
