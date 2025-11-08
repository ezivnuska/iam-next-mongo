// app/api/poker/ai/add/route.ts

import { NextResponse } from 'next/server';
import { addAIPlayerToGame } from '@/app/poker/lib/server/ai-player-manager';

export async function POST(request: Request) {
  try {
    const { gameId, name } = await request.json();

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
    }

    await addAIPlayerToGame(gameId, name);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Error adding AI player:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
