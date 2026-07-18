import type { Server, Socket } from 'socket.io'
import { connectToDatabase } from '../../../lib/mongoose'
import UserModel from '../../../lib/models/user'
import WordDuelRoomModel, { WordDuelRoomDocument } from './models/word-duel-room'
import { pickWord } from './word-bank'

// ─── Serialisers ──────────────────────────────────────────────────────────────

function toClientRoom(room: WordDuelRoomDocument) {
  return {
    id: room.roomId,
    hostId: room.hostId,
    hostUsername: room.hostUsername,
    players: room.players.map(p => ({ id: p.id, username: p.username })),
    maxPlayers: room.maxPlayers,
    status: room.status as 'waiting' | 'playing',
  }
}

function toClientGameState(room: WordDuelRoomDocument) {
  return {
    id: room.roomId,
    word: room.word ?? '',
    revealedLetters: [...room.revealedLetters],
    guessedLetters: [...room.guessedLetters],
    currentPlayerId: room.currentPlayerId ?? '',
    players: room.players.map(p => ({
      id: p.id,
      username: p.username,
      score: p.score,
      isCpu: p.isCpu,
    })),
    phase: (room.phase ?? 'playing') as 'playing' | 'round_over' | 'game_over',
    winnerId: room.winnerId,
    message: room.message,
    roundNumber: room.roundNumber,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROOM_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateRoomId(): string {
  return Array.from(
    { length: 6 },
    () => ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  ).join('')
}

async function generateUniqueRoomId(): Promise<string> {
  let id: string
  do {
    id = generateRoomId()
  } while (await WordDuelRoomModel.exists({ roomId: id, status: { $ne: 'finished' } }))
  return id
}

async function getUsername(userId: string): Promise<string> {
  const user = await UserModel.findById(userId, { username: 1 }).lean() as { username?: string } | null
  return user?.username ?? 'Player'
}

async function broadcastRoomsList(io: Server): Promise<void> {
  const rooms = await WordDuelRoomModel.find({ status: 'waiting' }).sort({ createdAt: -1 }).lean()
  io.emit('rooms:list', { rooms: rooms.map(r => toClientRoom(r as unknown as WordDuelRoomDocument)) })
}

function startGame(room: WordDuelRoomDocument): void {
  room.status = 'playing'
  room.word = pickWord()
  room.revealedLetters = []
  room.guessedLetters = []
  room.currentPlayerId = room.players[0].id
  room.phase = 'playing'
  room.winnerId = null
  room.message = null
  room.roundNumber = 1
}

// ─── Handler registration ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerWordDuelHandlers(io: Server, socket: Socket<any, any, any, { userId: string }>): void {

  // ── rooms:list ──────────────────────────────────────────────────────────────
  socket.on('rooms:list', async () => {
    try {
      await connectToDatabase()
      const rooms = await WordDuelRoomModel.find({ status: 'waiting' }).sort({ createdAt: -1 }).lean()
      socket.emit('rooms:list', { rooms: rooms.map(r => toClientRoom(r as unknown as WordDuelRoomDocument)) })
    } catch (err) {
      console.error('[WordDuel] rooms:list error:', err)
    }
  })

  // ── room:create ─────────────────────────────────────────────────────────────
  socket.on('room:create', async () => {
    if (!socket.data.userId) return
    try {
      await connectToDatabase()
      const username = await getUsername(socket.data.userId)
      const roomId = await generateUniqueRoomId()

      const room = await WordDuelRoomModel.create({
        roomId,
        hostId: socket.data.userId,
        hostUsername: username,
        players: [{ id: socket.data.userId, username, score: 0, isCpu: false }],
        maxPlayers: 2,
        status: 'waiting',
      })

      socket.join(`room:${roomId}`)
      socket.emit('room:created', { room: toClientRoom(room) })
      await broadcastRoomsList(io)
    } catch (err) {
      console.error('[WordDuel] room:create error:', err)
      socket.emit('room:error', { message: 'Failed to create room' })
    }
  })

  // ── room:join ───────────────────────────────────────────────────────────────
  socket.on('room:join', async ({ roomId }: { roomId: string }) => {
    if (!socket.data.userId || !roomId) return
    try {
      await connectToDatabase()

      const room = await WordDuelRoomModel.findOne({ roomId })
      if (!room || room.status === 'finished') {
        socket.emit('room:error', { message: 'Room not found' })
        return
      }

      // Already a member — just rejoin the socket room
      if (room.players.some(p => p.id === socket.data.userId)) {
        socket.join(`room:${roomId}`)
        socket.emit('room:joined', { room: toClientRoom(room) })
        return
      }

      if (room.status !== 'waiting') {
        socket.emit('room:error', { message: 'Game already in progress' })
        return
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('room:error', { message: 'Room is full' })
        return
      }

      const username = await getUsername(socket.data.userId)
      room.players.push({ id: socket.data.userId, username, score: 0, isCpu: false })

      const gameStarted = room.players.length >= room.maxPlayers
      if (gameStarted) startGame(room)

      room.markModified('players')
      await room.save()

      socket.join(`room:${roomId}`)
      socket.emit('room:joined', { room: toClientRoom(room) })
      io.to(`room:${roomId}`).emit('room:updated', { room: toClientRoom(room) })

      if (gameStarted) {
        io.to(`room:${roomId}`).emit('game:started', { state: toClientGameState(room) })
        await broadcastRoomsList(io)
      }
    } catch (err) {
      console.error('[WordDuel] room:join error:', err)
      socket.emit('room:error', { message: 'Failed to join room' })
    }
  })

  // ── room:leave ──────────────────────────────────────────────────────────────
  socket.on('room:leave', async ({ roomId }: { roomId: string }) => {
    if (!socket.data.userId || !roomId) return
    try {
      await connectToDatabase()
      const room = await WordDuelRoomModel.findOne({ roomId })
      if (!room) return

      if (room.status === 'playing') {
        // Forfeit: remaining player wins
        const remaining = room.players.find(p => p.id !== socket.data.userId)
        room.phase = 'game_over'
        room.status = 'finished'
        room.winnerId = remaining?.id ?? null
        room.message = remaining ? `${remaining.username} wins!` : 'Game over'
        await room.save()
        socket.to(`room:${roomId}`).emit('game:over', { state: toClientGameState(room) })
      } else {
        room.players = room.players.filter(p => p.id !== socket.data.userId) as typeof room.players
        if (room.players.length === 0) {
          room.status = 'finished'
          await room.save()
        } else {
          if (room.hostId === socket.data.userId) {
            room.hostId = room.players[0].id
            room.hostUsername = room.players[0].username
          }
          room.markModified('players')
          await room.save()
          io.to(`room:${roomId}`).emit('room:updated', { room: toClientRoom(room) })
        }
        await broadcastRoomsList(io)
      }

      socket.leave(`room:${roomId}`)
      socket.emit('room:left', { roomId })
    } catch (err) {
      console.error('[WordDuel] room:leave error:', err)
    }
  })

  // ── room:rejoin ─────────────────────────────────────────────────────────────
  socket.on('room:rejoin', async ({ roomId }: { roomId: string }) => {
    if (!socket.data.userId || !roomId) return
    try {
      await connectToDatabase()
      const room = await WordDuelRoomModel.findOne({ roomId, status: { $ne: 'finished' } })

      if (!room || !room.players.some(p => p.id === socket.data.userId)) {
        socket.emit('room:rejoin_failed', { message: 'Room no longer available' })
        return
      }

      socket.join(`room:${roomId}`)
      socket.emit('room:rejoined', { room: toClientRoom(room) })
      socket.to(`room:${roomId}`).emit('game:player_reconnected', { userId: socket.data.userId })
    } catch (err) {
      console.error('[WordDuel] room:rejoin error:', err)
      socket.emit('room:rejoin_failed', { message: 'Failed to rejoin room' })
    }
  })

  // ── game:state:request ──────────────────────────────────────────────────────
  socket.on('game:state:request', async ({ gameId }: { gameId: string }) => {
    if (!socket.data.userId || !gameId) return
    try {
      await connectToDatabase()
      const room = await WordDuelRoomModel.findOne({ roomId: gameId })
      if (!room || !room.word) return
      socket.emit('game:state', { state: toClientGameState(room) })
    } catch (err) {
      console.error('[WordDuel] game:state:request error:', err)
    }
  })

  // ── game:guess ──────────────────────────────────────────────────────────────
  socket.on('game:guess', async ({ gameId, letter }: { gameId: string; letter: string }) => {
    if (!socket.data.userId || !gameId || !letter) return

    const L = letter.toUpperCase().trim()
    if (L.length !== 1 || !/[A-Z]/.test(L)) return

    try {
      await connectToDatabase()
      const room = await WordDuelRoomModel.findOne({ roomId: gameId, status: 'playing' })
      if (!room || room.phase !== 'playing') return
      if (room.currentPlayerId !== socket.data.userId) return
      if (room.guessedLetters.includes(L)) return

      const inWord = room.word!.includes(L)
      room.guessedLetters.push(L)

      if (inWord) {
        room.revealedLetters.push(L)
        const wordSolved = room.word!.split('').every(l => room.revealedLetters.includes(l))
        const playerIdx = room.players.findIndex(p => p.id === socket.data.userId)

        if (playerIdx !== -1) {
          room.players[playerIdx].score += 1 + (wordSolved ? 3 : 0)
        }

        if (wordSolved) {
          const winner = room.players.find(p => p.id === socket.data.userId)
          room.phase = 'game_over'
          room.status = 'finished'
          room.winnerId = socket.data.userId
          room.message = `${winner?.username} solved it!`
        } else {
          room.message = `✓  ${L}  is in the word — keep going!`
        }
      } else {
        const currentIdx = room.players.findIndex(p => p.id === socket.data.userId)
        const nextIdx = (currentIdx + 1) % room.players.length
        const next = room.players[nextIdx]
        room.currentPlayerId = next.id
        room.message = `✗  No ${L}  —  ${next.username}'s turn`
      }

      room.markModified('players')
      await room.save()

      if (room.phase === 'game_over') {
        io.to(`room:${gameId}`).emit('game:over', { state: toClientGameState(room) })
      } else {
        io.to(`room:${gameId}`).emit('game:state', { state: toClientGameState(room) })
      }
    } catch (err) {
      console.error('[WordDuel] game:guess error:', err)
    }
  })

  // ── game:next_round ─────────────────────────────────────────────────────────
  socket.on('game:next_round', async ({ gameId }: { gameId: string }) => {
    if (!socket.data.userId || !gameId) return
    try {
      await connectToDatabase()
      const room = await WordDuelRoomModel.findOne({ roomId: gameId, status: 'playing' })
      if (!room || room.phase !== 'round_over') return
      if (!room.players.some(p => p.id === socket.data.userId)) return

      const lastWinnerId = room.winnerId
      room.word = pickWord()
      room.revealedLetters = []
      room.guessedLetters = []
      room.phase = 'playing'
      room.currentPlayerId = lastWinnerId ?? room.players[0].id
      room.winnerId = null
      room.message = null
      room.roundNumber += 1

      await room.save()
      io.to(`room:${gameId}`).emit('game:state', { state: toClientGameState(room) })
    } catch (err) {
      console.error('[WordDuel] game:next_round error:', err)
    }
  })

  // ── game:end ────────────────────────────────────────────────────────────────
  socket.on('game:end', async ({ gameId }: { gameId: string }) => {
    if (!socket.data.userId || !gameId) return
    try {
      await connectToDatabase()
      const room = await WordDuelRoomModel.findOne({ roomId: gameId, status: 'playing' })
      if (!room) return
      if (!room.players.some(p => p.id === socket.data.userId)) return

      const sorted = [...room.players].sort((a, b) => b.score - a.score)
      const isTie = sorted.length > 1 && sorted[0].score === sorted[1].score

      room.phase = 'game_over'
      room.status = 'finished'
      room.winnerId = isTie ? null : sorted[0].id
      room.message = isTie ? "It's a tie!" : `${sorted[0].username} wins!`

      await room.save()
      io.to(`room:${gameId}`).emit('game:over', { state: toClientGameState(room) })
    } catch (err) {
      console.error('[WordDuel] game:end error:', err)
    }
  })
}
