import mongoose, { Schema, Document, Model } from 'mongoose'

export interface LCPlayer {
  id: string
  username: string
  score: number
}

export interface LCBoardCell {
  letter: string
  owner: 'p1' | 'p2' | 'shared'
}

export interface LCPosition { row: number; col: number }

export interface LCWordResult {
  word: string
  positions: LCPosition[]
  scoreGain: number
}

export interface LetrisChessRoomDocument extends Document {
  roomId: string
  hostId: string
  players: LCPlayer[]
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  challengedUserId: string | null
  // Game state — null until game starts
  board: (LCBoardCell | null)[][] | null
  currentPlayerId: string | null
  phase: 'playing' | 'game_over' | null
  winnerId: string | null
  turn: number
  chainTurn: boolean
  lastMove: { from: LCPosition; to: LCPosition } | null
  lastWords: LCWordResult[]
  createdAt: Date
  updatedAt: Date
}

const playerSchema = new Schema<LCPlayer>(
  {
    id:       { type: String, required: true },
    username: { type: String, required: true },
    score:    { type: Number, default: 0 },
  },
  { _id: false }
)

const letrisChessRoomSchema = new Schema<LetrisChessRoomDocument>(
  {
    roomId:           { type: String, required: true, unique: true, index: true },
    hostId:           { type: String, required: true },
    players:          { type: [playerSchema], default: [] },
    maxPlayers:       { type: Number, default: 2 },
    status:           { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
    challengedUserId: { type: String, default: null },
    board:            { type: Schema.Types.Mixed, default: null },
    currentPlayerId:  { type: String, default: null },
    phase:            { type: String, default: null },
    winnerId:         { type: String, default: null },
    turn:             { type: Number, default: 0 },
    chainTurn:        { type: Boolean, default: false },
    lastMove:         { type: Schema.Types.Mixed, default: null },
    lastWords:        { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
)

// Auto-delete rooms 24 hours after creation
letrisChessRoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 })

const LetrisChessRoomModel: Model<LetrisChessRoomDocument> =
  mongoose.models.LetrisChessRoom ||
  mongoose.model<LetrisChessRoomDocument>('LetrisChessRoom', letrisChessRoomSchema)

export default LetrisChessRoomModel
