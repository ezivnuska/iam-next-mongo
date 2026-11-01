import mongoose, { Schema, Document, Model } from 'mongoose'

export interface TetrisScoreDocument extends Document {
  userId: string
  username: string
  score: number
  createdAt: Date
}

const tetrisScoreSchema = new Schema<TetrisScoreDocument>(
  {
    userId:   { type: String, required: true, index: true },
    username: { type: String, required: true },
    score:    { type: Number, required: true },
  },
  { timestamps: true }
)

const TetrisScoreModel: Model<TetrisScoreDocument> =
  mongoose.models.TetrisScore ||
  mongoose.model<TetrisScoreDocument>('TetrisScore', tetrisScoreSchema)

export default TetrisScoreModel
