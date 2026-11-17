// app/lib/hooks/useFriendshipSocketEvents.ts

import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { FriendshipStatusPayload, FriendRequestPayload } from '@/app/lib/socket/events';
import { useSocketListener } from './use-socket-listener';

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

    useSocketListener<FriendshipStatusPayload>(socket, SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, payload => {
        if (userId && (payload.otherUserId === userId || payload.friendshipId === friendshipId)) {
            onFriendRequestAccepted?.(payload);
        }
    });

    useSocketListener<FriendshipStatusPayload>(socket, SOCKET_EVENTS.FRIEND_REQUEST_REJECTED, payload => {
        if (userId && (payload.otherUserId === userId || payload.friendshipId === friendshipId)) {
            onFriendshipEnded?.(payload);
        }
    });

    useSocketListener<FriendshipStatusPayload>(socket, SOCKET_EVENTS.FRIENDSHIP_REMOVED, payload => {
        if (userId && (payload.otherUserId === userId || payload.friendshipId === friendshipId)) {
            onFriendshipEnded?.(payload);
        }
        onFriendshipRemoved?.(payload);
    });

    useSocketListener<FriendRequestPayload>(socket, SOCKET_EVENTS.FRIEND_REQUEST_SENT, payload => {
        if (isCurrentUser || (userId && payload.requester.id === userId)) {
            onFriendRequestSent?.(payload);
        }
    });
}
