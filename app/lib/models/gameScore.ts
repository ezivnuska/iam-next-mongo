import mongoose, { Schema, Model, Types, Document } from 'mongoose'

export interface GameScoreDocument extends Document {
  _id: Types.ObjectId
  game: string
  userId: Types.ObjectId
  score: number
  createdAt: Date
  updatedAt: Date
}

const GameScoreSchema = new Schema<GameScoreDocument>(
  {
    game:   { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score:  { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

GameScoreSchema.index({ game: 1, score: -1 })
GameScoreSchema.index({ game: 1, userId: 1 })

const GameScoreModel: Model<GameScoreDocument> =
  mongoose.models.GameScore ||
  mongoose.model<GameScoreDocument>('GameScore', GameScoreSchema)

export default GameScoreModel
