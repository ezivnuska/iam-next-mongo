import { WORD_SET } from './word-list'

// ─── Constants ────────────────────────────────────────────────────────────────

const BOARD_ROWS = 12
const BOARD_COLS = 9

const CUE_BALL_ROW = 10
const CUE_BALL_COL = 4

const REACTIVE_SPAWN_ROWS = [5, 6, 7]

const SCORE_PER_TILE = 10
const WIN_SCORE_THRESHOLD = 200

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

export type CellOwner = 'p1' | 'p2' | 'reactive' | null

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

function generateReactiveLetters(): string[] {
  return Array.from({ length: 13 }, randomLetter)
}

// ─── Board creation ───────────────────────────────────────────────────────────

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null))

  // Cue ball — starts owned by P1 (initiating player)
  board[CUE_BALL_ROW][CUE_BALL_COL] = { letter: '', owner: 'p1' }

  // Triangle of 13 reactive tiles (downward-pointing, centered on col 4, rows 5–7)
  const letters = generateReactiveLetters()
  let li = 0
  for (let col = 1; col <= 7; col++) board[REACTIVE_SPAWN_ROWS[0]][col] = { letter: letters[li++], owner: 'reactive' }
  for (let col = 2; col <= 6; col++) board[REACTIVE_SPAWN_ROWS[1]][col] = { letter: letters[li++], owner: 'reactive' }
  board[REACTIVE_SPAWN_ROWS[2]][4] = { letter: letters[li++], owner: 'reactive' }

  return board
}

// ─── Movement ─────────────────────────────────────────────────────────────────

const DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0,  -1],           [0,  1],
  [1,  -1], [1,  0], [1,  1],
]

export function getValidMoves(board: Board, from: Position, owner: CellOwner): Position[] {
  if (!owner || owner === 'reactive') return []
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

// ─── Cue ball ownership ───────────────────────────────────────────────────────

export function updateCueBallOwner(board: Board, newOwner: 'p1' | 'p2'): Board {
  const next = board.map(r => [...r]) as Board
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const cell = next[row][col]
      if (cell && (cell.owner === 'p1' || cell.owner === 'p2')) {
        next[row][col] = { ...cell, owner: newOwner }
        return next
      }
    }
  }
  return next
}

// ─── Reactive tile slides — billiard physics ──────────────────────────────────
//
// Tiles slide away from the cue ball with wall reflections (angle in = angle
// out). When a moving tile hits another reactive tile, momentum transfers: the
// moving tile stops and the struck tile continues in the same direction.
// Each tile is triggered at most once per turn.

export function applyReactiveSlides(
  board: Board,
  trigger: Position,
): { board: Board; slides: { from: Position; to: Position }[] } {
  const current = board.map(r => [...r]) as Board
  const allSlides: { from: Position; to: Position }[] = []
  const triggered = new Set<string>([`${trigger.row},${trigger.col}`])

  interface Task { row: number; col: number; dr: number; dc: number }
  const queue: Task[] = []

  for (const [dr, dc] of DIRS) {
    const r = trigger.row + dr
    const c = trigger.col + dc
    if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) continue
    if (current[r][c]?.owner !== 'reactive') continue
    const key = `${r},${c}`
    if (!triggered.has(key)) {
      triggered.add(key)
      queue.push({ row: r, col: c, dr, dc })
    }
  }

  while (queue.length > 0) {
    const { row: startRow, col: startCol, dr: initDr, dc: initDc } = queue.shift()!

    let row = startRow, col = startCol
    let dr = initDr, dc = initDc

    for (let step = 0; step < 500; step++) {
      let nextRow = row + dr
      let nextCol = col + dc

      if (nextRow < 0 || nextRow >= BOARD_ROWS) { dr = -dr; nextRow = row + dr }
      if (nextCol < 0 || nextCol >= BOARD_COLS) { dc = -dc; nextCol = col + dc }

      const nextCell = current[nextRow][nextCol]
      if (nextCell !== null) {
        if (nextCell.owner === 'reactive') {
          const nextKey = `${nextRow},${nextCol}`
          if (!triggered.has(nextKey)) {
            triggered.add(nextKey)
            queue.push({ row: nextRow, col: nextCol, dr, dc })
          }
        }
        break
      }

      row = nextRow
      col = nextCol
    }

    if (row !== startRow || col !== startCol) {
      current[row][col] = current[startRow][startCol]
      current[startRow][startCol] = null
      allSlides.push({ from: { row: startRow, col: startCol }, to: { row, col } })
    }
  }

  return { board: current, slides: allSlides }
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
    if (cells[i] === null || cells[i]!.letter === '') { i++; continue }
    const runStart = i
    while (i < cells.length && cells[i] !== null && cells[i]!.letter !== '') i++
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

// ─── Win condition ────────────────────────────────────────────────────────────

export function isWinningMove(playerScore: number): boolean {
  return playerScore >= WIN_SCORE_THRESHOLD
}

// ─── Tile replenishment ───────────────────────────────────────────────────────

export function spawnReactiveTiles(board: Board, count: number): Board {
  const next = board.map(r => [...r]) as Board
  const emptyCells: Position[] = []
  for (const row of REACTIVE_SPAWN_ROWS) {
    for (let col = 0; col < BOARD_COLS; col++) {
      if (next[row][col] === null) emptyCells.push({ row, col })
    }
  }
  for (let i = emptyCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]]
  }
  for (const pos of emptyCells.slice(0, count)) {
    next[pos.row][pos.col] = { letter: randomLetter(), owner: 'reactive' }
  }
  return next
}
