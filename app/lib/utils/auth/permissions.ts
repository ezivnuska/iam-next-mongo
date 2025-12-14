// app/lib/utils/permissions.ts

export function canDeleteComment(
	commentAuthorId: string,
	currentUserId?: string,
	currentUserRole?: string
): boolean {
	if (!currentUserId) return false
	return commentAuthorId === currentUserId || currentUserRole === 'admin'
}

export function canDeleteItem(
	itemOwnerId: string,
	currentUserId?: string,
	currentUserRole?: string
): boolean {
	if (!currentUserId) return false
	return itemOwnerId === currentUserId || currentUserRole === 'admin'
}
