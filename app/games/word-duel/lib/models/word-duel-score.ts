import mongoose, { Schema, Document, Model } from 'mongoose'

export interface WordDuelScoreDocument extends Document {
  userId: string
  username: string
  score: number   // points earned in this game
  won: boolean
  createdAt: Date
}

const wordDuelScoreSchema = new Schema<WordDuelScoreDocument>(
  {
    userId:   { type: String, required: true, index: true },
    username: { type: String, required: true },
    score:    { type: Number, required: true, default: 0 },
    won:      { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
)

const WordDuelScoreModel: Model<WordDuelScoreDocument> =
  mongoose.models.WordDuelScore ||
  mongoose.model<WordDuelScoreDocument>('WordDuelScore', wordDuelScoreSchema)

export default WordDuelScoreModel
