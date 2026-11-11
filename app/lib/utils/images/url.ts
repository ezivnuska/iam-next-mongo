// app/lib/utils/image-url.ts

/**
 * Constructs an S3 image URL for a user's image file
 * @param username - The username
 * @param filename - The image filename
 * @returns Full S3 URL to the image
 */
export function getS3ImageUrl(username: string, filename: string): string {
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/users/${username}/${filename}`;
}

/**
 * Constructs an S3 URL from a full S3 key path
 * @param key - The S3 key (e.g., "users/username/filename.jpg")
 * @returns Full S3 URL
 */
export function getS3UrlFromKey(key: string): string {
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Extracts and validates the S3 key from a full image URL.
 * Returns null if the URL is not from our bucket or the key looks unsafe.
 * All user image keys have the form "users/{username}/{filename}".
 */
export function extractS3KeyFromUrl(url: string): string | null {
  const prefix = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  if (!key || key.includes('..') || !key.startsWith('users/')) return null;
  return key;
}
