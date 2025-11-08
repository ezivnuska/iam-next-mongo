// app/api/poker/ai/remove/route.ts

import { NextResponse } from 'next/server';
import { removeAIPlayerFromGame } from '@/app/poker/lib/server/ai-player-manager';

export async function POST(request: Request) {
  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    await removeAIPlayerFromGame(gameId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error removing AI player:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
