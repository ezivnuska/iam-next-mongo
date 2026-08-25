import type { Server, Socket } from 'socket.io'

// ─── In-memory room store ─────────────────────────────────────────────────────

interface TogglePlayer {
  id: string
  username: string
}

interface ToggleRoom {
  id: string
  hostId: string
  players: TogglePlayer[]
  maxPlayers: number
  status: 'waiting' | 'playing'
  game: { grid: string[]; startedAt: number } | null
  scores: Record<string, number>
  words: Record<string, string[]>
  timer: ReturnType<typeof setTimeout> | null
}

export const toggleRooms = new Map<string, ToggleRoom>()

// ─── Grid generation ──────────────────────────────────────────────────────────

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])
const CONSONANT_POOL = [
  'R', 'R', 'R',
  'S', 'S', 'S',
  'T', 'T', 'T',
  'N', 'N', 'N',
  'L', 'L',
  'C', 'C',
  'D', 'D',
  'P', 'M', 'H', 'G',
  'B', 'F', 'W', 'Y',
  'K', 'V',
]
const GRID_SIZE = 3

function generateGrid(): string[] {
  const vowelList = Array.from(VOWELS)
  const vowelCount = 3 + Math.floor(Math.random() * 2)
  const letters: string[] = []
  for (let i = 0; i < vowelCount; i++) {
    letters.push(vowelList[Math.floor(Math.random() * vowelList.length)])
  }
  for (let i = 0; i < GRID_SIZE * GRID_SIZE - vowelCount; i++) {
    letters.push(CONSONANT_POOL[Math.floor(Math.random() * CONSONANT_POOL.length)])
  }
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]]
  }
  return letters
}

// ─── Room ID generation ───────────────────────────────────────────────────────

const ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRoomId(): string {
  let id = ''
  for (let i = 0; i < 6; i++) id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  return id
}

function generateUniqueRoomId(): string {
  let id: string
  do { id = generateRoomId() } while (toggleRooms.has(id))
  return id
}

// ─── Match lifecycle ──────────────────────────────────────────────────────────

function publicRoom(room: ToggleRoom) {
  return {
    id: room.id,
    hostId: room.hostId,
    players: room.players,
    maxPlayers: room.maxPlayers,
    status: room.status,
    game: 'toggle',
  }
}

function startMatch(io: Server, roomId: string) {
  const room = toggleRooms.get(roomId)
  if (!room) return

  room.status = 'playing'
  room.game = { grid: generateGrid(), startedAt: Date.now() }
  for (const p of room.players) {
    room.scores[p.id] = 0
    room.words[p.id] = []
  }

  io.to(roomId).emit('toggle:started', {
    matchId: roomId,
    grid: room.game.grid,
    startedAt: room.game.startedAt,
    players: room.players.map(p => ({ userId: p.id, username: p.username })),
  })

  room.timer = setTimeout(() => endMatch(io, roomId), 122_000)
}

function endMatch(io: Server, roomId: string) {
  const room = toggleRooms.get(roomId)
  if (!room) return

  if (room.timer) { clearTimeout(room.timer); room.timer = null }

  const scores = room.players.map(p => ({
    userId: p.id,
    username: p.username,
    score: room.scores[p.id] ?? 0,
    words: room.words[p.id] ?? [],
  }))

  io.to(roomId).emit('toggle:game_over', { matchId: roomId, scores })
  toggleRooms.delete(roomId)
}

// ─── Handler registration ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerToggleHandlers(io: Server, socket: Socket<any, any, any, { userId: string; username?: string }>): void {

  // ── toggle:sync — re-sends toggle:started if the match is already running ──
  socket.on('toggle:sync', ({ roomId }: { roomId: string }) => {
    const { userId } = socket.data
    if (!userId || !roomId) return
    const room = toggleRooms.get(roomId)
    if (!room || room.status !== 'playing' || !room.game) return
    if (!room.players.find(p => p.id === userId)) return
    socket.emit('toggle:started', {
      matchId: roomId,
      grid: room.game.grid,
      startedAt: room.game.startedAt,
      players: room.players.map(p => ({ userId: p.id, username: p.username })),
    })
  })

  // ── toggle:word ────────────────────────────────────────────────────────────
  socket.on('toggle:word', ({ matchId, word, score }: { matchId: string; word: string; score: number }) => {
    const { userId } = socket.data
    if (!userId || !matchId) return
    const room = toggleRooms.get(matchId)
    if (!room || room.status !== 'playing') return
    if (room.scores[userId] !== undefined) room.scores[userId] = score
    if (room.words[userId] && word && !room.words[userId].includes(word)) {
      room.words[userId].push(word)
    }
    const opponent = room.players.find(p => p.id !== userId)
    if (opponent) {
      io.to(`user:${opponent.id}`).emit('toggle:opponent_word', {
        word,
        wordScore: 0,
        totalScore: score,
      })
    }
  })

  // ── disconnect — handle in-match disconnections ────────────────────────────
  socket.on('disconnect', () => {
    const { userId, username } = socket.data
    if (!userId) return
    for (const [roomId, room] of toggleRooms.entries()) {
      if (!room.players.find(p => p.id === userId)) continue
      if (room.status === 'waiting') {
        room.players = room.players.filter(p => p.id !== userId)
        if (room.players.length === 0) {
          toggleRooms.delete(roomId)
        } else {
          io.to(roomId).emit('room:updated', { room: publicRoom(room) })
        }
      } else if (room.status === 'playing') {
        io.to(roomId).emit('game:player_disconnected', { userId, username, seconds: 30 })
      }
    }
  })
}

// ─── Room management (called from word-duel handlers) ────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppSocket = Socket<any, any, any, { userId: string; username?: string }>

export function handleToggleRoomCreate(io: Server, socket: AppSocket): void {
  const { userId, username } = socket.data
  if (!userId) return
  const roomId = generateUniqueRoomId()
  const room: ToggleRoom = {
    id: roomId,
    hostId: userId,
    players: [{ id: userId, username: username ?? 'Player' }],
    maxPlayers: 2,
    status: 'waiting',
    game: null,
    scores: {},
    words: {},
    timer: null,
  }
  toggleRooms.set(roomId, room)
  socket.join(roomId)
  socket.emit('room:created', { room: publicRoom(room) })
}

export function handleToggleRoomJoin(io: Server, socket: AppSocket, roomId: string): boolean {
  const room = toggleRooms.get(roomId)
  if (!room) return false

  const { userId, username } = socket.data
  if (!userId) return true  // it's a toggle room, signal handled even if auth fails

  if (room.players.find(p => p.id === userId)) {
    socket.join(roomId)
    socket.emit('room:joined', { room: publicRoom(room) })
    return true
  }
  if (room.status !== 'waiting') {
    socket.emit('room:error', { message: 'Match already in progress' })
    return true
  }
  if (room.players.length >= room.maxPlayers) {
    socket.emit('room:error', { message: 'Room is full' })
    return true
  }

  room.players.push({ id: userId, username: username ?? 'Player' })
  socket.join(roomId)
  socket.emit('room:joined', { room: publicRoom(room) })
  io.to(roomId).emit('room:updated', { room: publicRoom(room) })

  if (room.players.length >= room.maxPlayers) {
    startMatch(io, roomId)
  }
  return true
}

export function handleToggleRoomLeave(io: Server, socket: AppSocket, roomId: string): boolean {
  const room = toggleRooms.get(roomId)
  if (!room) return false

  const { userId } = socket.data
  if (!userId) return true

  if (room.timer) { clearTimeout(room.timer); room.timer = null }

  room.players = room.players.filter(p => p.id !== userId)
  socket.leave(roomId)
  socket.emit('room:left', { roomId })

  if (room.players.length === 0) {
    toggleRooms.delete(roomId)
  } else {
    io.to(roomId).emit('room:closed')
    toggleRooms.delete(roomId)
  }
  return true
}

export function handleToggleRoomRejoin(io: Server, socket: AppSocket, roomId: string): boolean {
  const room = toggleRooms.get(roomId)
  if (!room) return false

  const { userId, username } = socket.data
  if (!userId) return true

  if (!room.players.find(p => p.id === userId)) {
    socket.emit('room:rejoin_failed', { message: 'Room no longer available' })
    return true
  }

  socket.join(roomId)
  socket.emit('room:rejoined', { room: publicRoom(room) })
  socket.to(roomId).emit('game:player_reconnected', { userId, username })
  return true
}

export function getToggleRoomGame(roomId: string): string | null {
  return toggleRooms.has(roomId) ? 'toggle' : null
}
