import { WORD_SET } from './word-list'
import type { LCBoardCell } from './models/letris-chess-room'

export type CellOwner = 'p1' | 'p2' | null
export type Board = (LCBoardCell | null)[][]

export interface Position { row: number; col: number }

export interface WordResult {
  word: string
  positions: Position[]
  captures: Position[]
  scoreGain: number
}

const BOARD_ROWS = 13
const BOARD_COLS = 13
const MIN_WORD_LEN = 3
const MAX_WORD_LEN = 8
const P1_START_ROWS = [11, 12]
const P2_START_ROWS = [0, 1]

const WORD_SCORES: Record<number, number> = {
  3: 100, 4: 200, 5: 400, 6: 800, 7: 800, 8: 800,
}

const LETTER_POOL: string[] = [
  'A','A','A','A','A','A',
  'E','E','E','E','E','E',
  'I','I','I','I','I',
  'O','O','O','O','O',
  'U','U','U',
  'R','R','R',
  'S','S','S',
  'T','T','T',
  'N','N','N',
  'L','L',
  'C','C',
  'D','D',
  'P','M','H','G',
  'B','F','W','Y',
  'K','V',
]

const RARE_LETTERS = ['Q','X','Z']

function randomLetter(): string {
  if (Math.random() < 0.01) return RARE_LETTERS[Math.floor(Math.random() * RARE_LETTERS.length)]
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateStartingLetters(): string[] {
  return Array.from({ length: 26 }, randomLetter)
}

export function createInitialBoard(p1Letters: string[], p2Letters: string[]): Board {
  const board: Board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))
  const p1 = shuffle(p1Letters)
  const p2 = shuffle(p2Letters)

  P1_START_ROWS.forEach((row, ri) => {
    for (let col = 0; col < BOARD_COLS; col++) {
      board[row][col] = { letter: p1[ri * BOARD_COLS + col], owner: 'p1' }
    }
  })

  P2_START_ROWS.forEach((row, ri) => {
    for (let col = 0; col < BOARD_COLS; col++) {
      board[row][col] = { letter: p2[ri * BOARD_COLS + col], owner: 'p2' }
    }
  })

  return board
}

export function getValidMoves(board: Board, from: Position, owner: CellOwner): Position[] {
  if (!owner) return []
  const { row, col } = from
  const forward = owner === 'p1' ? row - 1 : row + 1
  const candidates: Position[] = [
    { row: forward, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ]
  return candidates.filter(
    p => p.row >= 0 && p.row < BOARD_ROWS && p.col >= 0 && p.col < BOARD_COLS && board[p.row][p.col] === null
  )
}

export function hasAnyValidMove(board: Board, owner: CellOwner): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const cell = board[row][col]
      if (cell?.owner === owner && getValidMoves(board, { row, col }, owner).length > 0) return true
    }
  }
  return false
}

export function isGameOver(board: Board): boolean {
  return !hasAnyValidMove(board, 'p1') && !hasAnyValidMove(board, 'p2')
}

export function isLegalMove(board: Board, from: Position, to: Position, owner: CellOwner): boolean {
  const cell = board[from.row]?.[from.col]
  if (!cell || cell.owner !== owner) return false
  const valid = getValidMoves(board, from, owner)
  return valid.some(p => p.row === to.row && p.col === to.col)
}

export function applyMove(board: Board, from: Position, to: Position): Board {
  const next = board.map(r => [...r]) as Board
  next[to.row][to.col] = next[from.row][from.col]
  next[from.row][from.col] = null
  return next
}

interface WordMatch {
  axis: 'row' | 'col'
  idx: number
  start: number
  end: number
  word: string
}

function findWordsInSequence(cells: (LCBoardCell | null)[], lineIdx: number, axis: 'row' | 'col'): WordMatch[] {
  const results: WordMatch[] = []
  let i = 0
  while (i < cells.length) {
    if (cells[i] === null) { i++; continue }
    const runStart = i
    while (i < cells.length && cells[i] !== null) i++
    const runEnd = i
    if (runEnd - runStart < MIN_WORD_LEN) continue

    const candidates: WordMatch[] = []
    for (let j = runStart; j < runEnd; j++) {
      const maxLen = Math.min(MAX_WORD_LEN, runEnd - j)
      for (let len = maxLen; len >= MIN_WORD_LEN; len--) {
        const word = cells.slice(j, j + len).map(c => c!.letter).join('')
        if (WORD_SET.has(word)) candidates.push({ axis, idx: lineIdx, start: j, end: j + len, word })
      }
    }

    candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start)
    const used = new Array(cells.length).fill(false)
    for (const c of candidates) {
      let overlap = false
      for (let k = c.start; k < c.end; k++) {
        if (used[k]) { overlap = true; break }
      }
      if (!overlap) {
        results.push(c)
        for (let k = c.start; k < c.end; k++) used[k] = true
      }
    }
  }
  return results
}

export function findWordsAfterMove(board: Board, activeOwner: CellOwner): WordResult[] {
  const matches: WordMatch[] = []
  for (let row = 0; row < BOARD_ROWS; row++) {
    matches.push(...findWordsInSequence(board[row], row, 'row'))
  }
  for (let col = 0; col < BOARD_COLS; col++) {
    matches.push(...findWordsInSequence(board.map(r => r[col]), col, 'col'))
  }

  return matches.map(m => {
    const positions: Position[] = []
    const captures: Position[] = []
    for (let i = m.start; i < m.end; i++) {
      const pos = m.axis === 'row' ? { row: m.idx, col: i } : { row: i, col: m.idx }
      positions.push(pos)
      if (board[pos.row][pos.col]?.owner !== activeOwner) captures.push(pos)
    }
    return {
      word: m.word,
      positions,
      captures,
      scoreGain: WORD_SCORES[Math.min(m.word.length, 8)] ?? 0,
    }
  })
}

export function applyCaptures(board: Board, words: WordResult[], newOwner: CellOwner): Board {
  if (!newOwner) return board
  const next = board.map(r => [...r]) as Board
  for (const w of words) {
    for (const pos of w.captures) {
      const cell = next[pos.row][pos.col]
      if (cell) next[pos.row][pos.col] = { letter: cell.letter, owner: newOwner }
    }
  }
  return next
}

export function calcScoreGain(words: WordResult[]): number {
  return words.reduce((sum, w) => sum + w.scoreGain, 0)
}
