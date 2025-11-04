// app/api/poker/bet/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { placeBet } from '@/app/poker/lib/server/poker-game-controller';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

export const POST = withAuth(async (request, context, session) => {
  const { chipCount, gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  console.log(`[BET API] Received bet request: player=${session.user.id}, chipCount=${chipCount}, gameId=${id}`);

  const result = await placeBet(id, session.user.id, chipCount ?? 1);

  console.log(`[BET API] Bet processed successfully, hasAllIn=${result.game.players?.some((p: any) => p.isAllIn)}`);

  // Emit granular events based on what happened
  // These events include all necessary data:
  // - betPlaced: pot, playerBets, currentPlayerIndex, players (with chip counts and all-in status)
  // - cardsDealt: stage, communalCards, players (if included)
  // - roundComplete: winner, players (with updated chip counts)
  await PokerSocketEmitter.emitGameActionResults(result.events);

  return Response.json({ success: true });
});
