// app/lib/aws/s3.ts

import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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

  await s3Client.send(command);

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${folder}/${fileName}`;
}

export async function deleteS3File(key: string) {
    try {
      await s3Client.send(
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