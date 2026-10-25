import { NextRequest } from 'next/server'
import { getScores, saveScore } from '@/app/lib/utils/arcadeScores'

const GAME = 'tetris'

export function GET() {
  return getScores(GAME)
}

export function POST(req: NextRequest) {
  return saveScore(GAME, req)
}
