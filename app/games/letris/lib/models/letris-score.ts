import mongoose, { Schema, Document, Model } from 'mongoose'

export interface LetrisScoreDocument extends Document {
  userId: string
  username: string
  score: number
  createdAt: Date
}

const letrisScoreSchema = new Schema<LetrisScoreDocument>(
  {
    userId:   { type: String, required: true, index: true },
    username: { type: String, required: true },
    score:    { type: Number, required: true },
  },
  { timestamps: true }
)

const LetrisScoreModel: Model<LetrisScoreDocument> =
  mongoose.models.LetrisScore ||
  mongoose.model<LetrisScoreDocument>('LetrisScore', letrisScoreSchema)

export default LetrisScoreModel
