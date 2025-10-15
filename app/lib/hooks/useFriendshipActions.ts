// app/lib/hooks/useFriendshipActions.ts

import { useState } from 'react';
import { sendFriendRequest, removeFriend, acceptFriendRequest, rejectFriendRequest } from '@/app/lib/actions/friendships';

type ActionType = 'send' | 'accept' | 'reject' | 'remove' | undefined;

export function useFriendshipActions() {
    const [actionLoading, setActionLoading] = useState<ActionType>(undefined);

    const handleSendRequest = async (userId: string) => {
        setActionLoading('send');
        try {
            const result = await sendFriendRequest(userId);
            return result;
        } catch (error: any) {
            console.error('Failed to send friend request:', error);
            throw error;
        } finally {
            setActionLoading(undefined);
        }
    };

    const handleAcceptRequest = async (friendshipId: string) => {
        setActionLoading('accept');
        try {
            await acceptFriendRequest(friendshipId);
        } catch (error: any) {
            console.error('Failed to accept friend request:', error);
            throw error;
        } finally {
            setActionLoading(undefined);
        }
    };

    const handleRejectRequest = async (friendshipId: string) => {
        setActionLoading('reject');
        try {
            await rejectFriendRequest(friendshipId);
        } catch (error: any) {
            console.error('Failed to reject friend request:', error);
            throw error;
        } finally {
            setActionLoading(undefined);
        }
    };

    const handleRemoveFriend = async (friendshipId: string) => {
        setActionLoading('remove');
        try {
            await removeFriend(friendshipId);
        } catch (error: any) {
            console.error('Failed to remove friend:', error);
            throw error;
        } finally {
            setActionLoading(undefined);
        }
    };

    return {
        actionLoading,
        handleSendRequest,
        handleAcceptRequest,
        handleRejectRequest,
        handleRemoveFriend,
    };
}
