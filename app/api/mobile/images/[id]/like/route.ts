// app/api/mobile/images/[id]/like/route.ts
// POST — toggle like on an image

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import ImageModel from '@/app/lib/models/image'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: imageId } = await ctx.params
  if (!imageId || !/^[a-f\d]{24}$/i.test(imageId))
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const image = await ImageModel.findById(imageId).select('likes').lean() as any
    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const isLiked = (image.likes ?? []).some((id: any) => id.toString() === token.id)
    const updated = await ImageModel.findByIdAndUpdate(
      imageId,
      isLiked ? { $pull: { likes: token.id } } : { $addToSet: { likes: token.id } },
      { new: true, select: 'likes' }
    )
    return NextResponse.json({ liked: !isLiked, likeCount: updated?.likes?.length ?? 0 })
  } catch (err) {
    console.error('[mobile/images like POST]', err)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
})
