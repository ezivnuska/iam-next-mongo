// app/api/poker/check-stale/route.ts
/**
 * API route to check for and reset stale poker games
 * Called periodically by server or can be triggered manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { connectToDatabase } from '@/app/lib/mongoose';

const STALE_THRESHOLD_MS = 60 * 1000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    // Ensure database connection
    await connectToDatabase();

    // Find singleton game
    const game = await PokerGame.findOne({ isSingleton: true });

    if (!game) {
      return NextResponse.json({ message: 'No singleton game found' }, { status: 404 });
    }

    // Check if game is stale
    const lastUpdate = game.updatedAt.getTime();
    const now = Date.now();
    const timeSinceUpdate = now - lastUpdate;

    // Only consider stale if:
    // 1. Game has been inactive for more than threshold
    // 2. Game is locked (active game)
    // 3. Game has players
    const isStale =
      timeSinceUpdate > STALE_THRESHOLD_MS &&
      game.locked &&
      game.players?.length > 0;

    if (!isStale) {
      return NextResponse.json({
        message: 'Game is not stale',
        timeSinceUpdate: Math.round(timeSinceUpdate / 1000),
        isLocked: game.locked,
        playerCount: game.players?.length || 0,
      });
    }

    // Game is stale - trigger reset
    const gameId = String(game._id);
    console.log('[CheckStale] Stale game detected, triggering reset:', {
      gameId,
      timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + 's',
      lastUpdate: game.updatedAt.toISOString(),
    });

    // Use the existing reset singleton logic
    const { resetSingletonGame } = await import('@/app/poker/lib/server/game/singleton-game');
    await resetSingletonGame(gameId);

    // Notify all clients that the game was reset due to staleness
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    await PokerSocketEmitter.emitGameStaleReset();

    return NextResponse.json({
      message: 'Stale game reset successfully',
      timeSinceUpdate: Math.round(timeSinceUpdate / 1000),
      wasLocked: game.locked,
      playerCount: game.players?.length || 0,
    });
  } catch (error: any) {
    console.error('[CheckStale] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also support GET for easier manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
