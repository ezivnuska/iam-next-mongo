// app/lib/aws/s3.ts

import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { getS3UrlFromKey } from '../utils/images'

let _s3Client: S3Client | null = null
function getS3Client() {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return _s3Client
}

export async function uploadFileToS3(file: File | Blob, folder = "uploads") {
  const fileName = `${Date.now()}-${(file as any).name || "file"}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: `${folder}/${fileName}`,
    Body: buffer,
    ContentType: (file as any).type || "application/octet-stream",
  });

  await getS3Client().send(command);

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${folder}/${fileName}`;
}

const IMAGE_MIME: Record<string, string> = {
  jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
}
const IMAGE_VARIANT_DEFS = [
  { name: 'original', width: null as number | null },
  { name: 'medium', width: 800 },
  { name: 'small', width: 300 },
]

export type ImageVariantRecord = {
  size: string; filename: string; width: number; height: number; url: string
}

export async function uploadImageVariants(
  buffer: Buffer,
  extension: string,
  username: string,
): Promise<ImageVariantRecord[]> {
  const baseFilename = uuidv4()
  const variants: ImageVariantRecord[] = []
  for (const { name, width } of IMAGE_VARIANT_DEFS) {
    const sharpImg = width
      ? sharp(buffer).rotate().resize({ width, withoutEnlargement: true })
      : sharp(buffer).rotate()
    const outputBuffer = await sharpImg.toBuffer()
    const meta = await sharp(outputBuffer).metadata()
    const filename = `${baseFilename}_${name}.${extension}`
    const key = `users/${username}/${filename}`
    await getS3Client().send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: outputBuffer,
      ContentType: IMAGE_MIME[meta.format ?? ''] ?? 'application/octet-stream',
    }))
    variants.push({ size: name, filename, width: meta.width ?? 0, height: meta.height ?? 0, url: getS3UrlFromKey(key) })
  }
  return variants
}

export async function deleteS3File(key: string) {
    try {
      await getS3Client().send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: key,
        })
      );
      console.log(`Deleted S3 object: ${key}`);
    } catch (err) {
      console.error(`Failed to delete S3 object: ${key}`, err);
    }
}