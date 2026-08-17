import type { Server, Socket } from 'socket.io'
import { connectToDatabase } from '../../../lib/mongoose'
import UserModel from '../../../lib/models/user'
import LetrisChessRoomModel, { LetrisChessRoomDocument } from './models/letris-chess-room'
import LetrisChessScoreModel from './models/letris-chess-score'
import {
  createInitialBoard, isLegalMove, applyMove, applyReactiveSlides,
  findWordsAfterMove, applyWordRemovals, updateCueBallOwner,
  calcScoreGain, isWinningMove, hasAnyValidMove,
  type Board,
  type CellOwner,
  type Position,
} from './engine'

// Socket room prefix — distinguishes LC rooms from word-duel's `room:${id}` rooms
const LC = 'letris-chess:'

const RECONNECT_TIMEOUT_MS = 30_000
const reconnectTimers = new Map<string, NodeJS.Timeout>()

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
  } while (await LetrisChessRoomModel.exists({ roomId: id, status: { $ne: 'finished' } }))
  return id
}

async function getUserInfo(userId: string): Promise<{ username: string; avatar: object | null }> {
  const user = await UserModel.findById(userId, { username: 1, avatar: 1 }).lean() as { username?: string; avatar?: object } | null
  return { username: user?.username ?? 'Player', avatar: user?.avatar ?? null }
}

async function persistScores(room: LetrisChessRoomDocument): Promise<void> {
  if (!room.players.length) return
  await LetrisChessScoreModel.insertMany(
    room.players.map(p => ({
      userId:   p.id,
      username: p.username,
      score:    p.score,
      won:      room.winnerId === p.id,
    }))
  ).catch(err => console.error('[LetrisChess] persistScores error:', err))
}

function toClientRoom(room: LetrisChessRoomDocument) {
  return {
    id:         room.roomId,
    hostId:     room.hostId,
    players:    room.players.map(p => ({ id: p.id, username: p.username })),
    maxPlayers: room.maxPlayers,
    status:     room.status as 'waiting' | 'playing',
  }
}

function toClientGameState(room: LetrisChessRoomDocument) {
  return {
    id:              room.roomId,
    board:           room.board,
    players:         room.players.map(p => ({ id: p.id, username: p.username, score: p.score, avatar: p.avatar ?? null })),
    currentPlayerId: room.currentPlayerId ?? '',
    phase:           (room.phase ?? 'playing') as 'playing' | 'game_over',
    winnerId:        room.winnerId ?? null,
    lastMove:        room.lastMove ?? null,
    lastWords:       room.lastWords ?? [],
    reactiveSlides:  room.reactiveSlides ?? [],
    turn:            room.turn,
    chainTurn:       room.chainTurn ?? false,
  }
}

function cancelReconnectTimer(roomId: string, userId: string): void {
  const key = `${roomId}:${userId}`
  const timer = reconnectTimers.get(key)
  if (timer) {
    clearTimeout(timer)
    reconnectTimers.delete(key)
  }
}

// ─── Handler registration ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerLetrisChessHandlers(io: Server, socket: Socket<any, any, any, { userId: string; username?: string }>): void {

  // ── letris-chess:room:create ─────────────────────────────────────────────────
  socket.on('letris-chess:room:create', async () => {
    if (!socket.data.userId) return
    try {
      await connectToDatabase()
      const { username, avatar } = await getUserInfo(socket.data.userId)
      const roomId = await generateUniqueRoomId()

      const room = await LetrisChessRoomModel.create({
        roomId,
        hostId:    socket.data.userId,
        players:   [{ id: socket.data.userId, username, avatar, score: 0 }],
        maxPlayers: 2,
        status:    'waiting',
      })

      socket.join(`${LC}${roomId}`)
      socket.emit('room:created', { room: toClientRoom(room) })
    } catch (err) {
      console.error('[LetrisChess] room:create error:', err)
      socket.emit('room:error', { message: 'Failed to create room' })
    }
  })

  // ── letris-chess:room:join ───────────────────────────────────────────────────
  socket.on('letris-chess:room:join', async ({ roomId }: { roomId: string }) => {
    if (!socket.data.userId || !roomId) return
    try {
      await connectToDatabase()

      const room = await LetrisChessRoomModel.findOne({ roomId })
      if (!room || room.status === 'finished') {
        socket.emit('room:error', { message: 'Room not found' })
        return
      }

      // Already a member — rejoin the socket room
      if (room.players.some(p => p.id === socket.data.userId)) {
        socket.join(`${LC}${roomId}`)
        socket.emit('room:joined', { room: toClientRoom(room) })
        if (room.status === 'playing') {
          socket.emit('game:state', { state: toClientGameState(room) })
        }
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

      const { username, avatar } = await getUserInfo(socket.data.userId)
      room.players.push({ id: socket.data.userId, username, avatar, score: 0 })

      const gameStarted = room.players.length >= room.maxPlayers
      if (gameStarted) {
        const board = createInitialBoard()

        room.status          = 'playing'
        room.board           = board as unknown as typeof room.board
        room.currentPlayerId = room.players[0].id
        room.phase           = 'playing'
        room.winnerId        = null
        room.turn            = 1
        room.chainTurn       = false
        room.lastMove        = null
        room.lastWords       = []
        room.reactiveSlides  = []
        room.markModified('board')
      }

      room.markModified('players')
      await room.save()

      socket.join(`${LC}${roomId}`)
      socket.emit('room:joined', { room: toClientRoom(room) })
      io.to(`${LC}${roomId}`).emit('room:updated', { room: toClientRoom(room) })

      if (gameStarted) {
        io.to(`${LC}${roomId}`).emit('game:started', { state: toClientGameState(room) })
      }
    } catch (err) {
      console.error('[LetrisChess] room:join error:', err)
      socket.emit('room:error', { message: 'Failed to join room' })
    }
  })

  // ── letris-chess:room:leave ──────────────────────────────────────────────────
  socket.on('letris-chess:room:leave', async ({ roomId }: { roomId: string }) => {
    if (!socket.data.userId || !roomId) return
    try {
      await connectToDatabase()
      const room = await LetrisChessRoomModel.findOne({ roomId })
      if (!room) return

      cancelReconnectTimer(roomId, socket.data.userId)

      if (room.status === 'playing') {
        const remaining = room.players.find(p => p.id !== socket.data.userId)
        room.phase    = 'game_over'
        room.status   = 'finished'
        room.winnerId = remaining?.id ?? null
        await room.save()
        await persistScores(room)
        socket.to(`${LC}${roomId}`).emit('game:over', { state: toClientGameState(room) })
      } else if (room.status === 'finished') {
        socket.to(`${LC}${roomId}`).emit('room:closed')
      } else {
        room.players = room.players.filter(p => p.id !== socket.data.userId) as typeof room.players
        if (room.players.length === 0) {
          if (room.challengedUserId) {
            room.markModified('players')
            await room.save()
          } else {
            room.status = 'finished'
            await room.save()
          }
        } else {
          if (room.hostId === socket.data.userId) {
            room.hostId = room.players[0].id
          }
          room.markModified('players')
          await room.save()
          io.to(`${LC}${roomId}`).emit('room:updated', { room: toClientRoom(room) })
        }
      }

      socket.leave(`${LC}${roomId}`)
      socket.emit('room:left', { roomId })
    } catch (err) {
      console.error('[LetrisChess] room:leave error:', err)
    }
  })

  // ── letris-chess:room:rejoin ─────────────────────────────────────────────────
  socket.on('letris-chess:room:rejoin', async ({ roomId }: { roomId: string }) => {
    if (!socket.data.userId || !roomId) return
    try {
      await connectToDatabase()
      const room = await LetrisChessRoomModel.findOne({ roomId, status: { $ne: 'finished' } })

      if (!room || !room.players.some(p => p.id === socket.data.userId)) {
        socket.emit('room:rejoin_failed', { message: 'Room no longer available' })
        return
      }

      cancelReconnectTimer(roomId, socket.data.userId)

      socket.join(`${LC}${roomId}`)
      socket.emit('room:rejoined', { room: toClientRoom(room) })
      if (room.status === 'playing') {
        socket.emit('game:state', { state: toClientGameState(room) })
      }
      socket.to(`${LC}${roomId}`).emit('game:player_reconnected', { userId: socket.data.userId })
    } catch (err) {
      console.error('[LetrisChess] room:rejoin error:', err)
      socket.emit('room:rejoin_failed', { message: 'Failed to rejoin room' })
    }
  })

  // ── letris-chess:game:state:request ─────────────────────────────────────────
  socket.on('letris-chess:game:state:request', async ({ gameId }: { gameId: string }) => {
    if (!socket.data.userId || !gameId) return
    try {
      await connectToDatabase()
      const room = await LetrisChessRoomModel.findOne({ roomId: gameId, status: 'playing' })
      if (!room || !room.board) return
      socket.emit('game:state', { state: toClientGameState(room) })
    } catch (err) {
      console.error('[LetrisChess] game:state:request error:', err)
    }
  })

  // ── letris-chess:game:move ───────────────────────────────────────────────────
  socket.on('letris-chess:game:move', async ({ gameId, from, to }: { gameId: string; from: Position; to: Position }) => {
    if (!socket.data.userId || !gameId) return
    if (
      typeof from?.row !== 'number' || typeof from?.col !== 'number' ||
      typeof to?.row   !== 'number' || typeof to?.col   !== 'number'
    ) return

    try {
      await connectToDatabase()
      const room = await LetrisChessRoomModel.findOne({ roomId: gameId, status: 'playing' })
      if (!room || room.phase !== 'playing' || !room.board) return
      if (room.currentPlayerId !== socket.data.userId) return

      const playerIdx = room.players.findIndex(p => p.id === socket.data.userId)
      if (playerIdx < 0) return
      const owner: CellOwner = playerIdx === 0 ? 'p1' : 'p2'

      const board = room.board as unknown as Board

      if (!isLegalMove(board, from, to, owner)) {
        socket.emit('room:error', { message: 'Illegal move' })
        return
      }

      const movedBoard = applyMove(board, from, to)
      const { board: reactedBoard, slides: reactiveSlides } = applyReactiveSlides(movedBoard, to)
      const words      = findWordsAfterMove(reactedBoard)
      const finalBoard = words.length ? applyWordRemovals(reactedBoard, words) : reactedBoard

      const scoreGain = calcScoreGain(words)
      room.players[playerIdx].score += scoreGain
      room.board          = finalBoard as unknown as typeof room.board
      room.lastMove       = { from, to }
      room.lastWords      = words
      room.reactiveSlides = reactiveSlides
      room.turn          += 1

      room.markModified('board')
      room.markModified('players')
      room.markModified('lastWords')

      // Win condition: landed on opponent's back row and formed a word
      if (isWinningMove(to, owner, words)) {
        room.phase     = 'game_over'
        room.status    = 'finished'
        room.winnerId  = room.players[playerIdx].id
        room.chainTurn = false
        await room.save()
        await persistScores(room)
        io.to(`${LC}${gameId}`).emit('game:over', { state: toClientGameState(room) })
        return
      }

      if (words.length > 0) {
        // Chain turn: current player keeps moving
        room.chainTurn = true
      } else {
        // No words: flip cue ball ownership and pass turn
        const nextOwner: CellOwner = owner === 'p1' ? 'p2' : 'p1'
        const boardWithCue = updateCueBallOwner(finalBoard, nextOwner as 'p1' | 'p2')
        room.board = boardWithCue as unknown as typeof room.board

        if (!hasAnyValidMove(boardWithCue, nextOwner)) {
          if (!hasAnyValidMove(boardWithCue, owner)) {
            const sorted = [...room.players].sort((a, b) => b.score - a.score)
            const isTie  = sorted.length > 1 && sorted[0].score === sorted[1].score
            room.phase     = 'game_over'
            room.status    = 'finished'
            room.winnerId  = isTie ? null : sorted[0].id
            room.chainTurn = false
            await room.save()
            await persistScores(room)
            io.to(`${LC}${gameId}`).emit('game:over', { state: toClientGameState(room) })
            return
          }
          room.chainTurn = false
        } else {
          room.currentPlayerId = room.players[(playerIdx + 1) % room.players.length].id
          room.chainTurn       = false
        }
      }

      await room.save()
      io.to(`${LC}${gameId}`).emit('game:state', { state: toClientGameState(room) })
    } catch (err) {
      console.error('[LetrisChess] game:move error:', err)
    }
  })

  // ── letris-chess:game:end (forfeit) ─────────────────────────────────────────
  socket.on('letris-chess:game:end', async ({ gameId }: { gameId: string }) => {
    if (!socket.data.userId || !gameId) return
    try {
      await connectToDatabase()
      const room = await LetrisChessRoomModel.findOne({ roomId: gameId, status: 'playing' })
      if (!room) return
      if (!room.players.some(p => p.id === socket.data.userId)) return

      cancelReconnectTimer(gameId, socket.data.userId)

      const sorted  = [...room.players].sort((a, b) => b.score - a.score)
      const isTie   = sorted.length > 1 && sorted[0].score === sorted[1].score
      room.phase    = 'game_over'
      room.status   = 'finished'
      room.winnerId = isTie ? null : sorted[0].id

      await room.save()
      await persistScores(room)
      io.to(`${LC}${gameId}`).emit('game:over', { state: toClientGameState(room) })
    } catch (err) {
      console.error('[LetrisChess] game:end error:', err)
    }
  })

  // ── letris-chess:challenge:send ──────────────────────────────────────────────
  socket.on('letris-chess:challenge:send', async ({ toUserId, roomId }: { toUserId: string; roomId: string }) => {
    if (!socket.data.userId) return
    io.to(`user:${toUserId}`).emit('letris-chess:challenge:received', {
      fromId:       socket.data.userId,
      fromUsername: socket.data.username || 'Someone',
      roomId,
    })
    try {
      await connectToDatabase()
      await LetrisChessRoomModel.updateOne({ roomId, status: 'waiting' }, { challengedUserId: toUserId })
    } catch (err) {
      console.error('[LetrisChess] challenge:send error:', err)
    }
  })

  // ── disconnect — detect letris-chess room and start forfeit timer ────────────
  socket.on('disconnect', async () => {
    const userId = socket.data.userId
    if (!userId) return

    const lcSocketRooms = Array.from(socket.rooms)
      .filter(r => r.startsWith(LC) && r !== `${LC}${userId}`)

    for (const socketRoom of lcSocketRooms) {
      const roomId = socketRoom.slice(LC.length)
      try {
        await connectToDatabase()
        const room = await LetrisChessRoomModel.findOne({ roomId, status: 'playing' })
        if (!room || !room.players.some(p => p.id === userId)) continue

        socket.to(socketRoom).emit('game:player_disconnected', { userId })

        const timerKey = `${roomId}:${userId}`
        if (!reconnectTimers.has(timerKey)) {
          const timer = setTimeout(async () => {
            reconnectTimers.delete(timerKey)
            try {
              await connectToDatabase()
              const r = await LetrisChessRoomModel.findOne({ roomId, status: 'playing' })
              if (!r || !r.players.some(p => p.id === userId)) return

              const remaining = r.players.find(p => p.id !== userId)
              r.phase    = 'game_over'
              r.status   = 'finished'
              r.winnerId = remaining?.id ?? null
              await r.save()
              await persistScores(r)
              io.to(socketRoom).emit('game:over', { state: toClientGameState(r) })
            } catch (err) {
              console.error('[LetrisChess] forfeit timer error:', err)
            }
          }, RECONNECT_TIMEOUT_MS)
          reconnectTimers.set(timerKey, timer)
        }
      } catch (err) {
        console.error('[LetrisChess] disconnect handler error:', err)
      }
    }
  })
}
