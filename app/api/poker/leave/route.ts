// app/api/poker/leave/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { removePlayer } from '@/app/poker/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { PokerGame } from '@/app/poker/lib/models/poker-game';

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

  // If timer was cleared due to insufficient players, notify clients
  if (hadTimer && !gameState.actionTimer && gameState.players.length < 2) {
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

  // If game was reset (< 2 players remain), send full state update to sync hands, cards, etc.
  if (gameState.players.length < 2) {
    await PokerSocketEmitter.emitStateUpdate(gameState);
  }

  return Response.json({ success: true, gameState: serialized });
});
