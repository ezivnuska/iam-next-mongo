import mongoose, { Schema, Document, Model } from 'mongoose'

export interface TileScoreDocument extends Document {
  userId: string
  username: string
  score: string // "mm:ss" completion time — lower is better
  createdAt: Date
}

const tileScoreSchema = new Schema<TileScoreDocument>(
  {
    userId:   { type: String, required: true, index: true },
    username: { type: String, required: true },
    score:    { type: String, required: true },
  },
  { timestamps: true }
)

const TileScoreModel: Model<TileScoreDocument> =
  mongoose.models.TileScore ||
  mongoose.model<TileScoreDocument>('TileScore', tileScoreSchema)

export default TileScoreModel
