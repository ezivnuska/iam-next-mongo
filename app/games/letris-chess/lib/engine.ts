import { WORD_SET } from './word-list'

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_ROWS = 10
const BOARD_COLS = 10

const P1_START_ROW = 9
const P2_START_ROW = 0

const STARTING_LETTERS_COUNT = 10
const SHARED_TILE_COUNT = 20
const SHARED_ROWS = [4, 5, 6]

const SCORE_PER_TILE = 10

const MIN_WORD_LEN = 3
const MAX_WORD_LEN = 8

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

const RARE_LETTERS = ['Q', 'X', 'Z']

// ─── Types ────────────────────────────────────────────────────────────────────

export type CellOwner = 'p1' | 'p2' | 'shared' | null

export interface BoardCell {
  letter: string
  owner: CellOwner
}

export type Board = (BoardCell | null)[][]

export interface Position { row: number; col: number }

export interface WordResult {
  word: string
  positions: Position[]
  scoreGain: number
}

// ─── Letter generation ────────────────────────────────────────────────────────

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
  return Array.from({ length: STARTING_LETTERS_COUNT }, randomLetter)
}

export function generateSharedLetters(): string[] {
  return Array.from({ length: SHARED_TILE_COUNT }, randomLetter)
}

// ─── Board creation ───────────────────────────────────────────────────────────

export function createInitialBoard(
  p1Letters: string[],
  p2Letters: string[],
  sharedLetters: string[],
): Board {
  const board: Board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))

  for (let col = 0; col < BOARD_COLS; col++) {
    board[P1_START_ROW][col] = { letter: p1Letters[col], owner: 'p1' }
  }
  for (let col = 0; col < BOARD_COLS; col++) {
    board[P2_START_ROW][col] = { letter: p2Letters[col], owner: 'p2' }
  }

  const candidateCells: Position[] = []
  for (const row of SHARED_ROWS) {
    for (let col = 0; col < BOARD_COLS; col++) {
      candidateCells.push({ row, col })
    }
  }
  const chosen = shuffle(candidateCells).slice(0, SHARED_TILE_COUNT)
  chosen.forEach((pos, i) => {
    board[pos.row][pos.col] = { letter: sharedLetters[i], owner: 'shared' }
  })

  return board
}

// ─── Movement ─────────────────────────────────────────────────────────────────

const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0,  -1],           [0,  1],
  [1,  -1], [1,  0], [1,  1],
]

export function getValidMoves(board: Board, from: Position, owner: CellOwner): Position[] {
  if (!owner || owner === 'shared') return []
  const cell = board[from.row]?.[from.col]
  if (!cell || cell.owner !== owner) return []

  const { row, col } = from
  const moves: Position[] = []
  for (const [dr, dc] of DIRS) {
    let r = row + dr
    let c = col + dc
    while (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS && board[r][c] === null) {
      moves.push({ row: r, col: c })
      r += dr
      c += dc
    }
  }
  return moves
}

export function hasAnyValidMove(board: Board, owner: CellOwner): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (board[row][col]?.owner === owner && getValidMoves(board, { row, col }, owner).length > 0) {
        return true
      }
    }
  }
  return false
}

export function applyMove(board: Board, from: Position, to: Position): Board {
  const next = board.map(r => [...r]) as Board
  next[to.row][to.col] = next[from.row][from.col]
  next[from.row][from.col] = null
  return next
}

export function isLegalMove(board: Board, from: Position, to: Position, owner: CellOwner): boolean {
  const cell = board[from.row]?.[from.col]
  if (!cell || cell.owner !== owner) return false
  const valid = getValidMoves(board, from, owner)
  return valid.some(p => p.row === to.row && p.col === to.col)
}

// ─── Word detection ───────────────────────────────────────────────────────────

type LineSpec = { cells: (BoardCell | null)[]; positions: Position[] }
type FoundWord = { word: string; startIdx: number; endIdx: number }

function findWordsInSpec(spec: LineSpec): { positions: Position[]; word: string }[] {
  const { cells, positions } = spec
  const results: { positions: Position[]; word: string }[] = []
  let i = 0

  while (i < cells.length) {
    if (cells[i] === null) { i++; continue }
    const runStart = i
    while (i < cells.length && cells[i] !== null) i++
    const runEnd = i
    if (runEnd - runStart < MIN_WORD_LEN) continue

    const candidates: FoundWord[] = []
    for (let j = runStart; j < runEnd; j++) {
      const maxLen = Math.min(MAX_WORD_LEN, runEnd - j)
      for (let len = maxLen; len >= MIN_WORD_LEN; len--) {
        const word = cells.slice(j, j + len).map(c => c!.letter).join('')
        if (WORD_SET.has(word)) candidates.push({ word, startIdx: j, endIdx: j + len })
      }
    }

    candidates.sort((a, b) => (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx) || a.startIdx - b.startIdx)
    const used = new Array(cells.length).fill(false)
    for (const c of candidates) {
      let overlap = false
      for (let k = c.startIdx; k < c.endIdx; k++) {
        if (used[k]) { overlap = true; break }
      }
      if (!overlap) {
        results.push({ word: c.word, positions: positions.slice(c.startIdx, c.endIdx) })
        for (let k = c.startIdx; k < c.endIdx; k++) used[k] = true
      }
    }
  }

  return results
}

function buildLineSpecs(board: Board): LineSpec[] {
  const specs: LineSpec[] = []

  for (let row = 0; row < BOARD_ROWS; row++) {
    specs.push({
      cells:     board[row],
      positions: Array.from({ length: BOARD_COLS }, (_, col) => ({ row, col })),
    })
  }

  for (let col = 0; col < BOARD_COLS; col++) {
    specs.push({
      cells:     board.map(r => r[col]),
      positions: Array.from({ length: BOARD_ROWS }, (_, row) => ({ row, col })),
    })
  }

  // NW-SE diagonals (row - col = k)
  for (let k = -(BOARD_ROWS - 1); k <= BOARD_ROWS - 1; k++) {
    const positions: Position[] = []
    for (let row = 0; row < BOARD_ROWS; row++) {
      const col = row - k
      if (col >= 0 && col < BOARD_COLS) positions.push({ row, col })
    }
    if (positions.length >= MIN_WORD_LEN) {
      specs.push({ cells: positions.map(p => board[p.row][p.col]), positions })
    }
  }

  // NE-SW diagonals (row + col = s)
  for (let s = 0; s <= (BOARD_ROWS - 1) + (BOARD_COLS - 1); s++) {
    const positions: Position[] = []
    for (let row = 0; row < BOARD_ROWS; row++) {
      const col = s - row
      if (col >= 0 && col < BOARD_COLS) positions.push({ row, col })
    }
    if (positions.length >= MIN_WORD_LEN) {
      specs.push({ cells: positions.map(p => board[p.row][p.col]), positions })
    }
  }

  return specs
}

export function findWordsAfterMove(board: Board): WordResult[] {
  const specs = buildLineSpecs(board)
  const raw: { positions: Position[]; word: string }[] = []
  for (const spec of specs) raw.push(...findWordsInSpec(spec))

  const seen = new Set<string>()
  const unique = raw.filter(fw => {
    const key = fw.positions.map(p => `${p.row},${p.col}`).sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return unique.map(fw => ({
    word:      fw.word,
    positions: fw.positions,
    scoreGain: fw.positions.length * SCORE_PER_TILE,
  }))
}

// ─── Word resolution ──────────────────────────────────────────────────────────

export function applyWordRemovals(board: Board, words: WordResult[]): Board {
  const next = board.map(r => [...r]) as Board
  for (const w of words) {
    for (const pos of w.positions) {
      next[pos.row][pos.col] = null
    }
  }
  return next
}

export function calcScoreGain(words: WordResult[]): number {
  const unique = new Set<string>()
  for (const w of words) {
    for (const p of w.positions) unique.add(`${p.row},${p.col}`)
  }
  return unique.size * SCORE_PER_TILE
}

export function countOwnRemovedTiles(preRemovalBoard: Board, words: WordResult[], owner: CellOwner): number {
  const seen = new Set<string>()
  let count = 0
  for (const w of words) {
    for (const p of w.positions) {
      const key = `${p.row},${p.col}`
      if (!seen.has(key)) {
        seen.add(key)
        if (preRemovalBoard[p.row][p.col]?.owner === owner) count++
      }
    }
  }
  return count
}

export function spawnTiles(board: Board, owner: CellOwner, count: number): Board {
  if (!owner || owner === 'shared' || count <= 0) return board
  const startRow = owner === 'p1' ? P1_START_ROW : P2_START_ROW

  const emptyCols: number[] = []
  for (let col = 0; col < BOARD_COLS; col++) {
    if (board[startRow][col] === null) emptyCols.push(col)
  }

  const chosen = shuffle(emptyCols).slice(0, count)
  const next = board.map(r => [...r]) as Board
  for (const col of chosen) {
    next[startRow][col] = { letter: randomLetter(), owner }
  }
  return next
}

// ─── Win condition ────────────────────────────────────────────────────────────

export function isWinningMove(to: Position, owner: CellOwner, words: WordResult[]): boolean {
  if (!words.length) return false
  if (owner === 'p1') return to.row === P2_START_ROW
  if (owner === 'p2') return to.row === P1_START_ROW
  return false
}
