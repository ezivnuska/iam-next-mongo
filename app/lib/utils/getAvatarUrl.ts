// app/lib/utils/getAvatarUrl.ts

export function getAvatarUrl(username?: string, filename?: string): string | undefined {
	return username && filename ? `/images/users/${username}/${filename}` : undefined
}