// app/api/poker/leave/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { removePlayer } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { PokerGame } from '@/app/lib/models/poker-game';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  // Get game state before removing to check timer
  const gameBefore = await PokerGame.findById(id);
  const hadTimer = !!gameBefore?.actionTimer;

  const gameState = await removePlayer(id, {
    id: session.user.id,
    username: session.user.username,
  });

  console.log('[Poker] Player left - Players remaining:', gameState.players?.length);

  // If timer was cleared due to insufficient players, notify clients
  if (hadTimer && !gameState.actionTimer && gameState.players.length < 2) {
    console.log('[Poker] Timer cleared - not enough players remaining');
    await PokerSocketEmitter.emitTimerCleared();
  }

  const serialized = serializeGame(gameState);

  // Emit granular player left event with actionHistory
  await PokerSocketEmitter.emitPlayerLeft({
    playerId: session.user.id,
    players: gameState.players,
    playerCount: gameState.players.length,
    gameReset: gameState.players.length === 0, // Game resets only if ALL players left
    actionHistory: gameState.actionHistory || [],
  });

  return Response.json({ success: true, gameState: serialized });
});
