// app/lib/actions/friendships.ts

"use server"

import { connectToDatabase } from "@/app/lib/mongoose"
import Friendship from "@/app/lib/models/friendship"
import type { Friendship as FriendshipType, Friend } from "@/app/lib/definitions/friendship"
import {
	emitFriendRequest,
	emitFriendRequestAccepted,
	emitFriendRequestRejected,
	emitFriendshipRemoved,
} from "@/app/lib/socket/emit"
import { logActivity } from "@/app/lib/utils/activity-logger"
import { requireAuth } from "@/app/lib/utils/auth"
import { auth } from "@/app/lib/auth"

export async function sendFriendRequest(recipientId: string) {
	const user = await requireAuth()

	if (user.id === recipientId) {
		throw new Error("Cannot send friend request to yourself")
	}

	await connectToDatabase()

	// Check if friendship already exists
	const existing = await Friendship.findOne({
		$or: [
			{ requester: user.id, recipient: recipientId },
			{ requester: recipientId, recipient: user.id }
		]
	})

	if (existing) {
		if (existing.status === 'accepted') {
			throw new Error("Already friends")
		}
		if (existing.status === 'pending') {
			throw new Error("Friend request already sent")
		}
		if (existing.status === 'rejected') {
			// Allow re-sending after rejection
			existing.status = 'pending'
			existing.requester = user.id
			existing.recipient = recipientId
			await existing.save()

			// Emit socket event for re-sent request
			await emitFriendRequest({
				friendshipId: existing._id.toString(),
				requester: {
					id: user.id,
					username: user.username || '',
				},
				recipient: {
					id: recipientId,
					username: '',
				},
			})

			return { success: true, friendshipId: existing._id.toString() }
		}
	}

	const friendship = await Friendship.create({
		requester: user.id,
		recipient: recipientId,
		status: 'pending',
	})

	// Log activity
	await logActivity({
		userId: user.id,
		action: 'create',
		entityType: 'friendship',
		entityId: friendship._id,
		entityData: {
			recipientId,
			status: 'pending'
		}
	})

	// Emit socket event (don't fail action if socket emit fails)
	try {
		await emitFriendRequest({
			friendshipId: friendship._id.toString(),
			requester: {
				id: user.id,
				username: user.username || '',
			},
			recipient: {
				id: recipientId,
				username: '',
			},
		})
	} catch (emitError) {
		console.error('[Friendship] Failed to emit socket event:', emitError)
	}

	return { success: true, friendshipId: friendship._id.toString() }
}

export async function acceptFriendRequest(friendshipId: string) {
	const user = await requireAuth()

	await connectToDatabase()

	const friendship = await Friendship.findById(friendshipId)
	if (!friendship) {
		throw new Error("Friend request not found")
	}

	// Only the recipient can accept
	if (friendship.recipient.toString() !== user.id) {
		throw new Error("Unauthorized to accept this request")
	}

	if (friendship.status === 'accepted') {
		throw new Error("Already accepted")
	}

	friendship.status = 'accepted'
	await friendship.save()

	// Log activity
	await logActivity({
		userId: user.id,
		action: 'update',
		entityType: 'friendship',
		entityId: friendshipId,
		entityData: {
			status: 'accepted',
			requesterId: friendship.requester.toString()
		}
	})

	// Emit socket event to requester (they need to know their request was accepted)
	emitFriendRequestAccepted({
		friendshipId: friendship._id.toString(),
		userId: friendship.requester.toString(),
		username: user.username || '',
		otherUserId: user.id, // The user who accepted (recipient)
	})

	return { success: true }
}

export async function rejectFriendRequest(friendshipId: string) {
	const user = await requireAuth()

	await connectToDatabase()

	const friendship = await Friendship.findById(friendshipId)
	if (!friendship) {
		throw new Error("Friend request not found")
	}

	// Only the recipient can reject
	if (friendship.recipient.toString() !== user.id) {
		throw new Error("Unauthorized to reject this request")
	}

	friendship.status = 'rejected'
	await friendship.save()

	// Log activity
	await logActivity({
		userId: user.id,
		action: 'update',
		entityType: 'friendship',
		entityId: friendshipId,
		entityData: {
			status: 'rejected',
			requesterId: friendship.requester.toString()
		}
	})

	// Emit socket event to requester
	emitFriendRequestRejected({
		friendshipId: friendship._id.toString(),
		userId: friendship.requester.toString(),
		username: user.username || '',
		otherUserId: user.id, // The user who rejected (recipient)
	})

	return { success: true }
}

export async function removeFriend(friendshipId: string) {
	const user = await requireAuth()

	await connectToDatabase()

	const friendship = await Friendship.findById(friendshipId)
	if (!friendship) {
		throw new Error("Friendship not found")
	}

	// Either party can remove the friendship
	const isRequester = friendship.requester.toString() === user.id
	const isRecipient = friendship.recipient.toString() === user.id

	if (!isRequester && !isRecipient) {
		throw new Error("Unauthorized to remove this friendship")
	}

	// Determine the other user to notify
	const otherUserId = isRequester ? friendship.recipient.toString() : friendship.requester.toString()

	// Save friendship data before deletion for activity log
	const friendshipData = {
		requesterId: friendship.requester.toString(),
		recipientId: friendship.recipient.toString(),
		status: friendship.status
	}

	await Friendship.findByIdAndDelete(friendshipId)

	// Log activity
	await logActivity({
		userId: user.id,
		action: 'delete',
		entityType: 'friendship',
		entityId: friendshipId,
		entityData: friendshipData
	})

	// Emit socket event to the other user
	emitFriendshipRemoved({
		friendshipId: friendshipId,
		userId: otherUserId,
		username: user.username || '',
		otherUserId: user.id, // The user who removed the friendship
	})

	return { success: true }
}

export async function getFriends(): Promise<Friend[]> {
	const session = await auth()
	if (!session?.user?.id) {
		return []
	}

	await connectToDatabase()

	const friendships = await Friendship.find({
		$or: [
			{ requester: session.user.id, status: 'accepted' },
			{ recipient: session.user.id, status: 'accepted' }
		]
	})
		.populate({
			path: 'requester',
			select: 'username avatar',
			populate: {
				path: 'avatar',
				select: '_id variants'
			}
		})
		.populate({
			path: 'recipient',
			select: 'username avatar',
			populate: {
				path: 'avatar',
				select: '_id variants'
			}
		})
		.sort({ createdAt: -1 })
		.lean()

	return friendships.map((f: any) => {
		const isRequester = f.requester._id.toString() === session.user.id
		const friend = isRequester ? f.recipient : f.requester

		return {
			id: friend._id.toString(),
			username: friend.username,
			avatar: friend.avatar ? {
				id: friend.avatar._id?.toString(),
				variants: friend.avatar.variants,
			} : null,
			friendshipId: f._id.toString(),
			friendsSince: f.createdAt?.toISOString() ?? new Date().toISOString(),
		}
	})
}

export async function getPendingRequests(): Promise<FriendshipType[]> {
	const session = await auth()
	if (!session?.user?.id) {
		return []
	}

	await connectToDatabase()

	const requests = await Friendship.find({
		recipient: session.user.id,
		status: 'pending'
	})
		.populate({
			path: 'requester',
			select: 'username avatar',
			populate: {
				path: 'avatar',
				select: '_id variants'
			}
		})
		.populate({
			path: 'recipient',
			select: 'username avatar',
			populate: {
				path: 'avatar',
				select: '_id variants'
			}
		})
		.sort({ createdAt: -1 })
		.lean()

	return requests.map((r: any) => ({
		id: r._id.toString(),
		requester: {
			id: r.requester._id.toString(),
			username: r.requester.username,
			avatar: r.requester.avatar ? {
				id: r.requester.avatar._id?.toString(),
				variants: r.requester.avatar.variants,
			} : null,
		},
		recipient: {
			id: r.recipient._id.toString(),
			username: r.recipient.username,
			avatar: r.recipient.avatar ? {
				id: r.recipient.avatar._id?.toString(),
				variants: r.recipient.avatar.variants,
			} : null,
		},
		status: r.status,
		createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
		updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
	}))
}

export async function getFriendshipStatus(userId: string): Promise<{
	status: 'none' | 'pending_sent' | 'pending_received' | 'accepted'
	friendshipId?: string
}> {
	const session = await auth()
	if (!session?.user?.id) {
		return { status: 'none' }
	}

	if (session.user.id === userId) {
		return { status: 'none' }
	}

	await connectToDatabase()

	const friendship = await Friendship.findOne({
		$or: [
			{ requester: session.user.id, recipient: userId },
			{ requester: userId, recipient: session.user.id }
		]
	}).lean<{
		_id: any
		requester: any
		recipient: any
		status: 'pending' | 'accepted' | 'rejected'
	}>()

	if (!friendship) {
		return { status: 'none' }
	}

	if (friendship.status === 'accepted') {
		return {
			status: 'accepted',
			friendshipId: friendship._id.toString()
		}
	}

	if (friendship.status === 'pending') {
		const isSender = friendship.requester.toString() === session.user.id
		return {
			status: isSender ? 'pending_sent' : 'pending_received',
			friendshipId: friendship._id.toString()
		}
	}

	return { status: 'none' }
}
