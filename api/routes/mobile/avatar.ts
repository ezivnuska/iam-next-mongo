// api/routes/mobile/avatar.ts
// POST  /api/mobile/avatar — upload file and set as avatar
// PATCH /api/mobile/avatar — set existing image as avatar by id

import { Hono } from 'hono'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import ImageModel from '../../../app/lib/models/image'
import { getS3UrlFromKey } from '../../../app/lib/utils/images'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const VARIANT_DEFINITIONS = [
  { name: 'original', width: null as number | null },
  { name: 'medium', width: 800 },
  { name: 'small', width: 300 },
]

function serializeAvatar(doc: any) {
  return { id: doc._id.toString(), variants: doc.variants ?? [] }
}

const avatar = new Hono<{ Variables: { token: TokenPayload } }>()

avatar.post('/api/mobile/avatar', authMiddleware, async (c) => {
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

    for (const { name, width } of VARIANT_DEFINITIONS) {
      const sharpImg = width
        ? sharp(buffer).rotate().resize({ width, withoutEnlargement: true })
        : sharp(buffer).rotate()
      const outputBuffer = await sharpImg.toBuffer()
      const meta = await sharp(outputBuffer).metadata()
      const filename = `${baseFilename}_${name}.${extension}`
      const key = `users/${username}/${filename}`
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        Body: outputBuffer,
        ContentType: file.type,
      }))
      variants.push({ size: name, filename, width: meta.width ?? 0, height: meta.height ?? 0, url: getS3UrlFromKey(key) })
    }

    const newImage = await ImageModel.create({ userId: token.id, username, alt: file.name, variants, likes: [] })
    await UserModel.findByIdAndUpdate(token.id, { avatar: newImage._id })
    return c.json({ avatar: serializeAvatar(newImage) })
  } catch (err) {
    console.error('[mobile/avatar POST]', err)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

avatar.patch('/api/mobile/avatar', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { imageId } = await c.req.json()
    if (imageId !== null && !/^[a-f\d]{24}$/i.test(imageId))
      return c.json({ error: 'Invalid imageId' }, 400)

    await connectToDatabase()
    if (imageId !== null) {
      const image = await ImageModel.findOne({ _id: imageId, userId: token.id }, '_id').lean()
      if (!image) return c.json({ error: 'Image not found' }, 404)
    }
    const user = await UserModel.findByIdAndUpdate(token.id, { avatar: imageId }, { new: true }).populate('avatar', '_id variants')
    if (!user) return c.json({ error: 'User not found' }, 404)

    const avatarResult = user.avatar ? serializeAvatar(user.avatar) : null
    return c.json({ avatar: avatarResult })
  } catch (err) {
    console.error('[mobile/avatar PATCH]', err)
    return c.json({ error: 'Failed to update avatar' }, 500)
  }
})

export default avatar
