// app/lib/definitions/issue.ts

import { PartialUser } from './user'
import type { Image } from './image'
import type { Types, Document } from 'mongoose'

export type IssueStatus = 'open' | 'completed'
export type IssueType = 'Clean Up' | 'Gardening' | 'Hauling'
export const ISSUE_TYPES: IssueType[] = ['Clean Up', 'Gardening', 'Hauling']

export interface ICompletion {
  _id: Types.ObjectId
  applicantId: Types.ObjectId
  images: Types.ObjectId[]
  reviews: { userId: Types.ObjectId; vote: 'approve' | 'deny' }[]
  status: 'pending' | 'approved' | 'denied'
  createdAt: Date
  updatedAt: Date
}

export interface IIssue extends Document {
  author: Types.ObjectId
  issueType: IssueType
  title?: string
  content?: string
  status: IssueStatus
  minPay?: number
  maxPay?: number
  location?: { latitude: number; longitude: number }
  locationVisible?: boolean
  image?: Types.ObjectId
  likes?: Types.ObjectId[]
  completion?: ICompletion | null
}

export interface Issue {
  id: string
  issueType: IssueType
  content?: string
  minPay?: number
  maxPay?: number
  location?: { latitude: number; longitude: number }
  locationVisible: boolean
  createdAt: string
  updatedAt: string
  author: PartialUser
  image?: Image
  likes?: string[]
  likedByCurrentUser?: boolean
  commentCount?: number
}
