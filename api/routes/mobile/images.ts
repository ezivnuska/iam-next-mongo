// api/routes/mobile/images.ts
// GET    /api/mobile/images           — list images
// POST   /api/mobile/images           — upload image
// DELETE /api/mobile/images/:id       — delete image + S3 files
// POST   /api/mobile/images/:id/like  — toggle like

import { Hono } from 'hono'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { Types } from 'mongoose'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import ImageModel from '../../../app/lib/models/image'
import Comment from '../../../app/lib/models/comment'
import Post from '../../../app/lib/models/post'
import { deleteS3File } from '../../../app/lib/aws/s3'
import { getS3UrlFromKey } from '../../../app/lib/utils/images'

let _s3: S3Client | null = null
function getS3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _s3
}

const VARIANT_DEFINITIONS = [
  { name: 'original', width: null as number | null },
  { name: 'medium', width: 800 },
  { name: 'small', width: 300 },
]

function serializeImage(img: any, currentUserId?: string) {
  return {
    id: img._id.toString(),
    userId: img.userId.toString(),
    username: img.username,
    alt: img.alt ?? '',
    variants: (img.variants ?? []).map((v: any) => ({ size: v.size, filename: v.filename, width: v.width, height: v.height, url: v.url })),
    likes: (img.likes ?? []).map((id: any) => id.toString()),
    likedByCurrentUser: currentUserId ? (img.likes ?? []).some((id: any) => id.toString() === currentUserId) : false,
    createdAt: img.createdAt?.toISOString() ?? new Date().toISOString(),
  }
}

const images = new Hono<{ Variables: { token: TokenPayload } }>()

images.get('/api/mobile/images', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const userId = c.req.query('userId') ?? token.id
    const imgs = await ImageModel.find({ userId }).sort({ createdAt: -1 }).lean()
    return c.json({ images: imgs.map((img: any) => serializeImage(img, token.id)) })
  } catch (err) {
    console.error('[mobile/images GET]', err)
    return c.json({ error: 'Failed to fetch images' }, 500)
  }
})

images.post('/api/mobile/images', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    if (!file) return c.json({ error: 'No file provided' }, 400)

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedMimeTypes.includes(file.type))
      return c.json({ error: 'Invalid file type' }, 400)

    const extension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!extension || !allowedExtensions.includes(extension))
      return c.json({ error: 'Invalid file extension' }, 400)

    if (file.size > 10 * 1024 * 1024)
      return c.json({ error: 'File exceeds 10MB limit' }, 400)

    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      const meta = await sharp(buffer).metadata()
      if (!meta.format || !['jpeg', 'png', 'gif', 'webp'].includes(meta.format))
        return c.json({ error: 'Invalid image format' }, 400)
    } catch {
      return c.json({ error: 'File is not a valid image' }, 400)
    }

    await connectToDatabase()
    const userDoc = await UserModel.findById(token.id)
    if (!userDoc) return c.json({ error: 'User not found' }, 404)
    const username = userDoc.username as string

    const baseFilename = uuidv4()
    const variants: any[] = []

    const MIME: Record<string, string> = {
      jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    }

    for (const { name, width } of VARIANT_DEFINITIONS) {
      const sharpImg = width
        ? sharp(buffer).rotate().resize({ width, withoutEnlargement: true })
        : sharp(buffer).rotate()
      const outputBuffer = await sharpImg.toBuffer()
      const meta = await sharp(outputBuffer).metadata()
      const filename = `${baseFilename}_${name}.${extension}`
      const key = `users/${username}/${filename}`
      await getS3().send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        Body: outputBuffer,
        ContentType: MIME[meta.format ?? ''] ?? 'application/octet-stream',
      }))
      variants.push({ size: name, filename, width: meta.width ?? 0, height: meta.height ?? 0, url: getS3UrlFromKey(key) })
    }

    const newImage = await ImageModel.create({ userId: token.id, username, alt: file.name, variants, likes: [] })
    return c.json({ image: serializeImage(newImage, token.id) }, 201)
  } catch (err) {
    console.error('[mobile/images POST]', err)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

images.delete('/api/mobile/images/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const imageId = c.req.param('id')
  if (!imageId || !/^[a-f\d]{24}$/i.test(imageId))
    return c.json({ error: 'Invalid image ID' }, 400)

  try {
    await connectToDatabase()
    const image = await ImageModel.findById(imageId)
    if (!image) return c.json({ error: 'Image not found' }, 404)

    const isOwner = image.userId.toString() === token.id
    const isAdmin = token.role === 'admin'
    if (!isOwner && !isAdmin) return c.json({ error: 'Forbidden' }, 403)

    const objectId = new Types.ObjectId(imageId)
    await Comment.deleteMany({ refId: objectId, refType: 'Image' })

    const user = await UserModel.findById(token.id)
    const wasAvatar = (user?.avatar as any)?.toString() === imageId
    if (wasAvatar) {
      user!.avatar = null
      await user!.save()
    }

    const postsWithImage = await Post.find({ image: objectId })
    const postsToDelete = postsWithImage.filter((p) => !p.content?.trim())
    if (postsToDelete.length > 0)
      await Post.deleteMany({ _id: { $in: postsToDelete.map((p) => p._id) } })
    const postsToUpdate = postsWithImage.filter((p) => p.content?.trim())
    if (postsToUpdate.length > 0)
      await Post.updateMany({ _id: { $in: postsToUpdate.map((p) => p._id) } }, { $unset: { image: '' } })

    for (const v of image.variants) {
      if (v.url) {
        const key = v.url.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1]
        if (key) await deleteS3File(key)
      }
    }

    await ImageModel.findByIdAndDelete(imageId)
    return c.json({ ok: true, avatarCleared: wasAvatar })
  } catch (err) {
    console.error('[mobile/images DELETE]', err)
    return c.json({ error: 'Failed to delete image' }, 500)
  }
})

images.post('/api/mobile/images/:id/like', authMiddleware, async (c) => {
  const token = c.get('token')
  const imageId = c.req.param('id')
  if (!imageId || !/^[a-f\d]{24}$/i.test(imageId))
    return c.json({ error: 'Invalid image ID' }, 400)

  try {
    await connectToDatabase()
    const image = await ImageModel.findById(imageId).select('likes').lean() as any
    if (!image) return c.json({ error: 'Image not found' }, 404)

    const isLiked = (image.likes ?? []).some((id: any) => id.toString() === token.id)
    const updated = await ImageModel.findByIdAndUpdate(
      imageId,
      isLiked ? { $pull: { likes: token.id } } : { $addToSet: { likes: token.id } },
      { new: true, select: 'likes' }
    )
    return c.json({ liked: !isLiked, likeCount: updated?.likes?.length ?? 0 })
  } catch (err) {
    console.error('[mobile/images like POST]', err)
    return c.json({ error: 'Failed to toggle like' }, 500)
  }
})

export default images
