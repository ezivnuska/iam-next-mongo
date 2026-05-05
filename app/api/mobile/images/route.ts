// app/api/mobile/images/route.ts
// GET  — list images (current user's or by userId query param)
// POST — upload a new image

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import UserModel from '@/app/lib/models/user'
import ImageModel from '@/app/lib/models/image'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { getS3UrlFromKey } from '@/app/lib/utils/images'

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

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()
    const userId = req.nextUrl.searchParams.get('userId') ?? token.id
    const images = await ImageModel.find({ userId }).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ images: images.map((img: any) => serializeImage(img, token.id)) })
  } catch (err) {
    console.error('[mobile/images GET]', err)
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, token) => {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedMimeTypes.includes(file.type))
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })

    const extension = file.name.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!extension || !allowedExtensions.includes(extension))
      return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 })

    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      const meta = await sharp(buffer).metadata()
      if (!meta.format || !['jpeg', 'png', 'gif', 'webp'].includes(meta.format))
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    } catch {
      return NextResponse.json({ error: 'File is not a valid image' }, { status: 400 })
    }

    await connectToDatabase()
    const userDoc = await UserModel.findById(token.id)
    if (!userDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
      await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME!, Key: key, Body: outputBuffer, ContentType: file.type }))
      variants.push({ size: name, filename, width: meta.width ?? 0, height: meta.height ?? 0, url: getS3UrlFromKey(key) })
    }

    const newImage = await ImageModel.create({ userId: token.id, username, alt: file.name, variants, likes: [] })
    return NextResponse.json({ image: serializeImage(newImage, token.id) }, { status: 201 })
  } catch (err) {
    console.error('[mobile/images POST]', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
})
