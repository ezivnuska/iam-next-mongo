// app/api/poker/join/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { addPlayer } from '@/app/lib/server/poker-game-controller';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { logPlayerJoined } from '@/app/lib/utils/action-history';
import { PokerGame } from '@/app/lib/models/poker-game';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  console.log('[Poker] Player joining:', session.user.username, 'Game:', id);

  const gameState = await addPlayer(id, {
    id: session.user.id,
    username: session.user.username || session.user.email || 'Guest',
  });

  // Find the newly joined player
  const joinedPlayer = gameState.players.find((p: any) => p.id === session.user.id);

  // Log player join action
  const currentStage = gameState.locked ? gameState.stage : -1;
  await logPlayerJoined(
    gameState._id.toString(),
    session.user.id,
    session.user.username || session.user.email || 'Guest',
    currentStage
  );

  // Fetch updated game state with new action history
  const updatedGame = await PokerGame.findById(id);
  const serializedState = serializeGame(updatedGame);

  // Emit granular player joined event with actionHistory and lockTime
  await PokerSocketEmitter.emitPlayerJoined({
    player: joinedPlayer,
    players: gameState.players,
    playerCount: gameState.players.length,
    lockTime: gameState.lockTime ? new Date(gameState.lockTime).toISOString() : undefined,
    actionHistory: updatedGame?.actionHistory || [],
  });

  return Response.json({ success: true, gameState: serializedState });
});
