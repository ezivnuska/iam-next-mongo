// app/lib/hooks/useFriendshipSocketEvents.ts

import { useEffect } from 'react';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { FriendshipStatusPayload, FriendRequestPayload } from '@/app/lib/socket/events';

interface UseFriendshipSocketEventsOptions {
    userId?: string;
    friendshipId?: string;
    isCurrentUser?: boolean;
    onFriendRequestAccepted?: (payload: FriendshipStatusPayload) => void;
    onFriendshipEnded?: (payload: FriendshipStatusPayload) => void;
    onFriendRequestSent?: (payload: FriendRequestPayload) => void;
    onFriendshipRemoved?: (payload: FriendshipStatusPayload) => void;
}

export function useFriendshipSocketEvents(options: UseFriendshipSocketEventsOptions) {
    const { socket } = useSocket();
    const {
        userId,
        friendshipId,
        isCurrentUser,
        onFriendRequestAccepted,
        onFriendshipEnded,
        onFriendRequestSent,
        onFriendshipRemoved,
    } = options;

    useEffect(() => {
        if (!socket) return;

        const handleFriendRequestAccepted = (payload: FriendshipStatusPayload) => {
            if (userId && (payload.otherUserId === userId || payload.friendshipId === friendshipId)) {
                onFriendRequestAccepted?.(payload);
            }
        };

        const handleFriendRequestRejected = (payload: FriendshipStatusPayload) => {
            if (userId && (payload.otherUserId === userId || payload.friendshipId === friendshipId)) {
                onFriendshipEnded?.(payload);
            }
        };

        const handleFriendshipRemoved = (payload: FriendshipStatusPayload) => {
            if (userId && (payload.otherUserId === userId || payload.friendshipId === friendshipId)) {
                onFriendshipEnded?.(payload);
            }
            onFriendshipRemoved?.(payload);
        };

        const handleFriendRequestSent = (payload: FriendRequestPayload) => {
            if (isCurrentUser || (userId && payload.requester.id === userId)) {
                onFriendRequestSent?.(payload);
            }
        };

        socket.on(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, handleFriendRequestAccepted);
        socket.on(SOCKET_EVENTS.FRIEND_REQUEST_REJECTED, handleFriendRequestRejected);
        socket.on(SOCKET_EVENTS.FRIENDSHIP_REMOVED, handleFriendshipRemoved);
        socket.on(SOCKET_EVENTS.FRIEND_REQUEST_SENT, handleFriendRequestSent);

        return () => {
            socket.off(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, handleFriendRequestAccepted);
            socket.off(SOCKET_EVENTS.FRIEND_REQUEST_REJECTED, handleFriendRequestRejected);
            socket.off(SOCKET_EVENTS.FRIENDSHIP_REMOVED, handleFriendshipRemoved);
            socket.off(SOCKET_EVENTS.FRIEND_REQUEST_SENT, handleFriendRequestSent);
        };
    }, [socket, userId, friendshipId, isCurrentUser, onFriendRequestAccepted, onFriendshipEnded, onFriendRequestSent, onFriendshipRemoved]);
}
