import mongoose, { Schema, Document, Model } from 'mongoose'

export interface WDPlayer {
  id: string
  username: string
  score: number
  isCpu: boolean
}

export interface WordDuelRoomDocument extends Document {
  roomId: string
  hostId: string
  hostUsername: string
  players: WDPlayer[]
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  // Game state — null until game starts
  word: string | null
  revealedLetters: string[]
  guessedLetters: string[]
  currentPlayerId: string | null
  phase: 'playing' | 'round_over' | 'game_over' | null
  winnerId: string | null
  message: string | null
  roundNumber: number
  createdAt: Date
  updatedAt: Date
}

const playerSchema = new Schema<WDPlayer>(
  {
    id:       { type: String, required: true },
    username: { type: String, required: true },
    score:    { type: Number, default: 0 },
    isCpu:    { type: Boolean, default: false },
  },
  { _id: false }
)

const wordDuelRoomSchema = new Schema<WordDuelRoomDocument>(
  {
    roomId:          { type: String, required: true, unique: true, index: true },
    hostId:          { type: String, required: true },
    hostUsername:    { type: String, required: true },
    players:         { type: [playerSchema], default: [] },
    maxPlayers:      { type: Number, default: 2 },
    status:          { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
    word:            { type: String, default: null },
    revealedLetters: { type: [String], default: [] },
    guessedLetters:  { type: [String], default: [] },
    currentPlayerId: { type: String, default: null },
    phase:           { type: String, default: null },
    winnerId:        { type: String, default: null },
    message:         { type: String, default: null },
    roundNumber:     { type: Number, default: 1 },
  },
  { timestamps: true }
)

// Auto-delete rooms 24 hours after creation
wordDuelRoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 })

const WordDuelRoomModel: Model<WordDuelRoomDocument> =
  mongoose.models.WordDuelRoom ||
  mongoose.model<WordDuelRoomDocument>('WordDuelRoom', wordDuelRoomSchema)

export default WordDuelRoomModel
