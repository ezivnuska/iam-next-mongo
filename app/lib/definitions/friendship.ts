// app/lib/definitions/friendship.ts

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export interface Friendship {
	id: string
	requester: {
		id: string
		username: string
		avatar?: {
			id: string
			variants: Array<{
				size: string
				url: string
				width: number
				height: number
			}>
		} | null
	}
	recipient: {
		id: string
		username: string
		avatar?: {
			id: string
			variants: Array<{
				size: string
				url: string
				width: number
				height: number
			}>
		} | null
	}
	status: FriendshipStatus
	createdAt: string
	updatedAt: string
}

export interface Friend {
	id: string
	username: string
	avatar?: {
		id: string
		variants: Array<{
			size: string
			url: string
			width: number
			height: number
		}>
	} | null
	friendshipId: string
	friendsSince: string
}
