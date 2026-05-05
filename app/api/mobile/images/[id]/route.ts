// app/api/mobile/images/[id]/route.ts
// DELETE — delete an image and all associated data

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import ImageModel from '@/app/lib/models/image'
import UserModel from '@/app/lib/models/user'
import Comment from '@/app/lib/models/comment'
import Post from '@/app/lib/models/post'
import { deleteS3File } from '@/app/lib/aws/s3'
import { Types } from 'mongoose'

export const DELETE = withAuth(async (req, token, ctx) => {
  const { id: imageId } = await ctx.params
  if (!imageId || !/^[a-f\d]{24}$/i.test(imageId))
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const image = await ImageModel.findById(imageId)
    if (!image) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const isOwner = image.userId.toString() === token.id
    const isAdmin = token.role === 'admin'
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const objectId = new Types.ObjectId(imageId)
    await Comment.deleteMany({ refId: objectId, refType: 'Image' })

    const user = await UserModel.findById(token.id)
    if (user?.avatar?.toString() === imageId) {
      user.avatar = null
      await user.save()
    }

    const postsWithImage = await Post.find({ image: objectId })
    const postsToDelete = postsWithImage.filter((p) => !p.content?.trim())
    if (postsToDelete.length > 0) await Post.deleteMany({ _id: { $in: postsToDelete.map((p) => p._id) } })
    const postsToUpdate = postsWithImage.filter((p) => p.content?.trim())
    if (postsToUpdate.length > 0) await Post.updateMany({ _id: { $in: postsToUpdate.map((p) => p._id) } }, { $unset: { image: '' } })

    for (const v of image.variants) {
      if (v.url) {
        const key = v.url.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1]
        if (key) await deleteS3File(key)
      }
    }

    await ImageModel.findByIdAndDelete(imageId)
    const wasAvatar = user?.avatar === null && image.userId.toString() === token.id
    return NextResponse.json({ ok: true, avatarCleared: wasAvatar })
  } catch (err) {
    console.error('[mobile/images DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
  }
})
