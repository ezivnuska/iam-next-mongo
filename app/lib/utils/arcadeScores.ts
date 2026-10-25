import { connectToDatabase } from '@/app/lib/mongoose'
import GameScoreModel from '@/app/lib/models/gameScore'
import UserModel from '@/app/lib/models/user'
import { getMobileUserId } from '@/app/lib/utils/mobileJwt'
import { formatAvatarForMobile } from '@/app/lib/utils/formatMobileUser'
import { NextRequest, NextResponse } from 'next/server'

function formatScoreDoc(doc: any) {
  const user = doc.userId
  return {
    _id: doc._id.toString(),
    score: doc.score,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: formatAvatarForMobile(user.avatar, user.username),
    },
    createdAt: doc.createdAt.toISOString(),
  }
}

export async function getScores(game: string) {
  await connectToDatabase()

  const docs = await GameScoreModel.find({ game })
    .populate({
      path: 'userId',
      model: UserModel,
      select: '_id username avatar',
      populate: { path: 'avatar', select: '_id variants username' },
    })
    .sort({ score: -1 })
    .limit(50)
    .lean()

  return NextResponse.json(docs.map(formatScoreDoc))
}

export async function saveScore(game: string, req: NextRequest) {
  const userId = getMobileUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let score: number
  try {
    const body = await req.json()
    score = Number(body.score)
    if (!Number.isFinite(score) || score < 0) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }

  await connectToDatabase()

  const doc = await GameScoreModel.create({ game, userId, score })
  const populated = await doc.populate({
    path: 'userId',
    model: UserModel,
    select: '_id username avatar',
    populate: { path: 'avatar', select: '_id variants username' },
  })

  return NextResponse.json(formatScoreDoc(populated), { status: 201 })
}

export async function getLeaderboardEntries(game: string, limit = 10) {
  await connectToDatabase()

  const rows = await GameScoreModel.aggregate([
    { $match: { game } },
    { $group: { _id: '$userId', bestScore: { $max: '$score' }, gamesPlayed: { $sum: 1 } } },
    { $sort: { bestScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userArr',
      },
    },
    { $unwind: '$userArr' },
    {
      $lookup: {
        from: 'images',
        localField: 'userArr.avatar',
        foreignField: '_id',
        as: 'avatarArr',
      },
    },
  ])

  return rows.map((r: any, i: number) => {
    const avatar = r.avatarArr?.[0] ?? null
    return {
      rank: i + 1,
      userId: r._id.toString(),
      username: r.userArr.username,
      bestScore: r.bestScore,
      gamesPlayed: r.gamesPlayed,
      game,
      avatar: formatAvatarForMobile(avatar, r.userArr.username),
    }
  })
}
