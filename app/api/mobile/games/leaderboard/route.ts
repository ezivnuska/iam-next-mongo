import { NextResponse } from 'next/server'
import { getLeaderboardEntries } from '@/app/lib/utils/arcadeScores'

export async function GET() {
  try {
    const [tetrisEntries, letrisEntries, toggleEntries] = await Promise.all([
      getLeaderboardEntries('tetris'),
      getLeaderboardEntries('letris'),
      getLeaderboardEntries('toggle'),
    ])

    return NextResponse.json({
      entries: [],          // word-duel
      tileEntries: [],      // tiles
      tetrisEntries,
      letrisEntries,
      toggleEntries,
    })
  } catch (err) {
    console.error('[mobile/games/leaderboard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
