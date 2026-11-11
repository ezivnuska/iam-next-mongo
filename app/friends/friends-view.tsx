'use client';

import { useState, useEffect } from 'react';
import { getFriends, getPendingRequests } from '@/app/lib/actions/friendships';
import { useFriendshipActions } from '@/app/lib/hooks/useFriendshipActions';
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents';
import { showError } from '@/app/lib/utils/error-handler';
import { Button } from '@iam/ui';
import UnifiedUserHeader from '@/app/ui/user/unified-user-header';
import type { Friend, Friendship } from '@/app/lib/definitions/friendship';
import type { FriendRequestPayload, FriendshipStatusPayload } from '@/app/lib/socket/events';

export default function FriendsView() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
    const [loading, setLoading] = useState(true);
    const { actionLoading, handleAcceptRequest, handleRejectRequest, handleRemoveFriend } = useFriendshipActions();

    useEffect(() => { loadData(); }, []);

    useFriendshipSocketEvents({
        isCurrentUser: true,
        onFriendRequestSent: (payload: FriendRequestPayload) => {
            setPendingRequests(prev => [{
                id: payload.friendshipId,
                requester: payload.requester,
                recipient: payload.recipient,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, ...prev]);
        },
        onFriendshipRemoved: (payload: FriendshipStatusPayload) => {
            setFriends(prev => prev.filter(f => f.friendshipId !== payload.friendshipId));
        },
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [friendsData, requestsData] = await Promise.all([getFriends(), getPendingRequests()]);
            setFriends(friendsData);
            setPendingRequests(requestsData);
        } catch (error) {
            console.error('Failed to load friends data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (friendshipId: string) => {
        try {
            await handleAcceptRequest(friendshipId);
            setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));
            await loadData();
        } catch (error) {
            showError(error, 'Failed to accept friend request');
        }
    };

    const handleReject = async (friendshipId: string) => {
        try {
            await handleRejectRequest(friendshipId);
            setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));
        } catch (error) {
            showError(error, 'Failed to reject friend request');
        }
    };

    const handleRemove = async (friendshipId: string) => {
        try {
            await handleRemoveFriend(friendshipId);
            setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
        } catch (error) {
            showError(error, 'Failed to remove friend');
        }
    };

    if (loading) {
        return <p className='px-4 py-8 text-sm text-gray-400'>Loading…</p>;
    }

    return (
        <div className='flex flex-col gap-6 px-4 py-4'>
            {pendingRequests.length > 0 && (
                <section className='flex flex-col gap-3'>
                    <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
                        Pending requests ({pendingRequests.length})
                    </h2>
                    <div className='flex flex-col gap-2'>
                        {pendingRequests.map(request => {
                            const avatarUrl = request.requester.avatar?.variants.find(v => v.size === 'small')?.url;
                            return (
                                <UnifiedUserHeader
                                    key={request.id}
                                    user={{ id: request.requester.id, username: request.requester.username }}
                                    avatar={avatarUrl}
                                    subtitle={new Date(request.createdAt).toLocaleDateString()}
                                    variant='card'
                                    avatarSize={40}
                                    actions={
                                        <>
                                            <Button size='sm' variant='default' onClick={() => handleAccept(request.id)} disabled={!!actionLoading}>
                                                Accept
                                            </Button>
                                            <Button size='sm' variant='secondary' onClick={() => handleReject(request.id)} disabled={!!actionLoading}>
                                                Decline
                                            </Button>
                                        </>
                                    }
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            <section className='flex flex-col gap-3'>
                <h2 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>
                    Friends ({friends.length})
                </h2>
                {friends.length === 0 ? (
                    <p className='text-sm text-gray-400'>No friends yet.</p>
                ) : (
                    <div className='flex flex-col gap-2'>
                        {friends.map(friend => {
                            const avatarUrl = friend.avatar?.variants.find(v => v.size === 'small')?.url;
                            return (
                                <UnifiedUserHeader
                                    key={friend.id}
                                    user={{ id: friend.id, username: friend.username }}
                                    avatar={avatarUrl}
                                    subtitle={`Friends since ${new Date(friend.friendsSince).toLocaleDateString()}`}
                                    variant='card'
                                    avatarSize={40}
                                    actions={
                                        <Button size='sm' variant='warn' onClick={() => handleRemove(friend.friendshipId)} disabled={!!actionLoading}>
                                            Remove
                                        </Button>
                                    }
                                />
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
