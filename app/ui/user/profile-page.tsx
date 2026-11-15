// app/ui/user/profile-page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContent, PageContentRow, PageContentList } from '@iam/ui';
import EntryList from '@/app/ui/user/entry-list';
import ImagesClient from '@/app/ui/images/images-client';
import FriendsView from '@/app/friends/friends-view';
import { useUser } from '@/app/lib/providers/user-provider';
import FriendshipButton from '@/app/ui/friendship/friendship-button';
import UserIdentity from '@/app/ui/user/user-identity';
import { getPendingRequests } from '@/app/lib/actions/friendships';
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { FriendRequestPayload } from '@/app/lib/socket/events';
import type { Image as ImageType } from '@/app/lib/definitions/image';

type Tab = 'posts' | 'memories' | 'images' | 'friends';

const CONTENT_TABS: { value: Tab; label: string }[] = [
    { value: 'posts', label: 'Posts' },
    { value: 'memories', label: 'Memories' },
    { value: 'images', label: 'Images' },
];

interface ProfilePageProps {
    username: string;
    userId: string;
    isOwnProfile: boolean;
    initialContent: ContentItem[];
    avatar?: ImageType | null;
}

export default function ProfilePage({ username, userId, isOwnProfile, initialContent, avatar }: ProfilePageProps) {
    const [activeTab, setActiveTab] = useState<Tab>('posts');
    const [entryTrigger, setEntryTrigger] = useState(0);
    const [uploadTrigger, setUploadTrigger] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const { user } = useUser();

    useEffect(() => {
        if (!isOwnProfile) return;
        getPendingRequests().then(r => setPendingCount(r.length)).catch(() => {});
    }, [isOwnProfile]);

    useFriendshipSocketEvents({
        isCurrentUser: isOwnProfile,
        onFriendRequestSent: (_payload: FriendRequestPayload) => setPendingCount(n => n + 1),
    });

    const showAddEntry = isOwnProfile && (activeTab === 'posts' || activeTab === 'memories');
    const showUpload = isOwnProfile && activeTab === 'images';

    const header = (
        <PageContentRow><div className='flex items-center justify-between py-2'>
            <div className='flex'>
                {!isOwnProfile && (
                    <UserIdentity username={username} avatar={avatar} size={40} />
                )}
                {isOwnProfile && CONTENT_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            activeTab === tab.value
                                ? 'bg-blue-600 text-white cursor-default'
                                : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
                {isOwnProfile && (
                    <button
                        onClick={() => { setActiveTab('friends'); setPendingCount(0); }}
                        className={`relative px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            activeTab === 'friends'
                                ? 'bg-blue-600 text-white cursor-default'
                                : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                        }`}
                    >
                        Friends
                        {pendingCount > 0 && activeTab !== 'friends' && (
                            <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none'>
                                {pendingCount}
                            </span>
                        )}
                    </button>
                )}
            </div>
            <div className='flex items-center gap-2'>
            {!isOwnProfile && (
                <FriendshipButton userId={userId} username={username} />
            )}
            {isOwnProfile && (
                <Link href='/settings' aria-label='Settings' className='p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors'>
                    <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <circle cx='12' cy='12' r='3' />
                        <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
                    </svg>
                </Link>
            )}
            {(showAddEntry || showUpload) && (
                <button
                    onClick={() => showAddEntry ? setEntryTrigger(n => n + 1) : setUploadTrigger(n => n + 1)}
                    aria-label={showAddEntry ? 'New entry' : 'Upload file'}
                    className='p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm'
                >
                    <svg xmlns='http://www.w3.org/2000/svg' className='w-5 h-5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <line x1='12' y1='5' x2='12' y2='19' />
                        <line x1='5' y1='12' x2='19' y2='12' />
                    </svg>
                </button>
            )}
            </div>
        </div></PageContentRow>
    );

    return (
        <PageContent header={header}>
            {activeTab === 'posts' && (
                <PageContentList>
                    <EntryList
                        initialContent={initialContent}
                        editable={isOwnProfile}
                        contentType='post'
                        triggerAdd={entryTrigger}
                    />
                </PageContentList>
            )}
            {activeTab === 'memories' && (
                <PageContentList>
                    <EntryList
                        initialContent={initialContent}
                        editable={isOwnProfile}
                        contentType='memory'
                        triggerAdd={entryTrigger}
                    />
                </PageContentList>
            )}
            {activeTab === 'images' && (
                <PageContentList>
                    <ImagesClient
                        userId={userId}
                        authorized={isOwnProfile}
                        triggerUpload={uploadTrigger}
                    />
                </PageContentList>
            )}
            {activeTab === 'friends' && (
                <PageContentList>
                    <FriendsView />
                </PageContentList>
            )}
        </PageContent>
    );
}
