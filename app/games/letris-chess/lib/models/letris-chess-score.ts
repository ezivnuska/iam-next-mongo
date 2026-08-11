import mongoose, { Schema, Document, Model } from 'mongoose'

export interface LetrisChessScoreDocument extends Document {
  userId: string
  username: string
  score: number
  won: boolean
  createdAt: Date
}

const letrisChessScoreSchema = new Schema<LetrisChessScoreDocument>(
  {
    userId:   { type: String, required: true, index: true },
    username: { type: String, required: true },
    score:    { type: Number, required: true, default: 0 },
    won:      { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
)

const LetrisChessScoreModel: Model<LetrisChessScoreDocument> =
  mongoose.models.LetrisChessScore ||
  mongoose.model<LetrisChessScoreDocument>('LetrisChessScore', letrisChessScoreSchema)

export default LetrisChessScoreModel
