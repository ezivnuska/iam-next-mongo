// app/ui/user/profile-page.tsx

'use client';

import { useState, useEffect } from 'react';
import { PageContent, PageContentRow, PageContentList, useHorizontalLayout } from '@iam/ui';
import { useRightPanel } from '@/app/lib/providers/right-panel-provider';
import EntryList from '@/app/ui/user/entry-list';
import ImagesClient from '@/app/ui/images/images-client';
import FriendsView from '@/app/friends/friends-view';
import { useUser } from '@/app/lib/providers/user-provider';
import FriendshipButton from '@/app/ui/friendship/friendship-button';
import UserIdentity from '@/app/ui/user/user-identity';
import FindOrInviteForm from '@/app/ui/find-or-invite-form';
import { getPendingRequests } from '@/app/lib/actions/friendships';
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { FriendRequestPayload } from '@/app/lib/socket/events';
import type { Image as ImageType } from '@/app/lib/definitions/image';

type Tab = 'posts' | 'memories' | 'images';

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
    const horizontalLayout = useHorizontalLayout();
    const { setRightPanel } = useRightPanel();

    useEffect(() => {
        if (!isOwnProfile) return;
        getPendingRequests().then(r => setPendingCount(r.length)).catch(() => {});
    }, [isOwnProfile]);

    useFriendshipSocketEvents({
        isCurrentUser: isOwnProfile,
        onFriendRequestSent: (_payload: FriendRequestPayload) => setPendingCount(n => n + 1),
    });

    useEffect(() => {
        if (!isOwnProfile || !horizontalLayout) {
            setRightPanel(null);
            return;
        }
        setRightPanel(
            <div className='flex flex-col gap-1 p-3 pt-4'>
                {CONTENT_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`w-full px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors ${
                            activeTab === tab.value
                                ? 'bg-blue-600 text-white cursor-default'
                                : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        );
        return () => setRightPanel(null);
    }, [isOwnProfile, horizontalLayout, activeTab, setRightPanel]);

    const showAddEntry = isOwnProfile && (activeTab === 'posts' || activeTab === 'memories');
    const showUpload = isOwnProfile && activeTab === 'images';

    const contentHeader = (
        <PageContentRow><div className='flex items-center justify-between py-2'>
            <div className='flex'>
                {!isOwnProfile && (
                    <UserIdentity username={username} avatar={avatar} size={40} />
                )}
                {isOwnProfile && !horizontalLayout && CONTENT_TABS.map(tab => (
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
            </div>
            <div className='flex items-center gap-2'>
            {!isOwnProfile && (
                <FriendshipButton userId={userId} username={username} />
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

    const friendsHeader = isOwnProfile ? (
        <PageContentRow>
            <div className='flex items-center justify-between py-2'>
                <div className='relative flex items-center gap-1 px-3 py-1.5'>
                    <span className='text-sm font-medium text-gray-600'>Friends</span>
                    {pendingCount > 0 && (
                        <span className='bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none'>
                            {pendingCount}
                        </span>
                    )}
                </div>
            </div>
        </PageContentRow>
    ) : null;

    return (
        <PageContent header={contentHeader}>
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
            {isOwnProfile && (
                <>
                    {friendsHeader}
                    <PageContentList>
                        <FindOrInviteForm />
                        <FriendsView />
                    </PageContentList>
                </>
            )}
        </PageContent>
    );
}
