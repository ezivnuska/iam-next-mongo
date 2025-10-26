// app/api/poker/bet/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { placeBet } from '@/app/lib/server/poker-game-controller';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

export const POST = withAuth(async (request, context, session) => {
  const { chipCount, gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  console.log('[Bet API] Received bet request:', {
    userId: session.user.id,
    username: session.user.username,
    gameId: id,
    chipCount: chipCount || 1,
    timestamp: new Date().toISOString()
  });

  const result = await placeBet(id, session.user.id, chipCount || 1);

  console.log('[Bet API] Bet processed successfully');

  // Emit granular events based on what happened
  await PokerSocketEmitter.emitGameActionResults(result.events);

  // If cards were dealt or game completed, also send full state update
  // This ensures clients have all the updated data (hands, action history, etc.)
  if (result.events.cardsDealt || result.events.roundComplete) {
    console.log('[Bet API] Sending full state update after round completion');
    await PokerSocketEmitter.emitStateUpdate(result.game);
  }

  return Response.json({ success: true });
});
