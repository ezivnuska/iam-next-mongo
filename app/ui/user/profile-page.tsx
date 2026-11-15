// app/ui/user/profile-page.tsx

'use client';

import { useState, useEffect } from 'react';
import { PageContent, PageContentRow, PageContentList, useHorizontalLayout } from '@iam/ui';
import { useRightPanel } from '@/app/lib/providers/right-panel-provider';
import EntryList from '@/app/ui/user/entry-list';
import ImagesClient from '@/app/ui/images/images-client';
import FriendsView from '@/app/friends/friends-view';
import FriendshipButton from '@/app/ui/friendship/friendship-button';
import UserIdentity from '@/app/ui/user/user-identity';
import FindOrInviteForm from '@/app/ui/find-or-invite-form';
import { getPendingRequests } from '@/app/lib/actions/friendships';
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents';
import { MemoriesIcon, PostsIcon, ImagesIcon } from '@/app/ui/icons/tab-icons';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { FriendRequestPayload } from '@/app/lib/socket/events';
import type { Image as ImageType } from '@/app/lib/definitions/image';

type Tab = 'posts' | 'memories' | 'images';

const CONTENT_TABS: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'posts', label: 'Posts', icon: PostsIcon },
    { value: 'memories', label: 'Memories', icon: MemoriesIcon },
    { value: 'images', label: 'Images', icon: ImagesIcon },
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
            <div className='@container h-full'>
                <div className='flex flex-col gap-1 p-2 pt-4'>
                    {CONTENT_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                if (tab.value === activeTab) {
                                    tab.value === 'images' ? setUploadTrigger(n => n + 1) : setEntryTrigger(n => n + 1);
                                } else {
                                    setActiveTab(tab.value);
                                }
                            }}
                            className={`w-full py-3 font-medium rounded-lg transition-colors flex flex-col items-center gap-1.5 cursor-pointer ${
                                activeTab === tab.value
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <div className='relative'>
                                <tab.icon className='w-6 h-6 shrink-0' />
                                {tab.value === activeTab && (
                                    <span className='absolute -top-1 -right-1 w-3 h-3 bg-white text-blue-600 rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>+</span>
                                )}
                            </div>
                            <span className='text-xs hidden @[120px]:block'>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
        return () => setRightPanel(null);
    }, [isOwnProfile, horizontalLayout, activeTab, setRightPanel, setEntryTrigger, setUploadTrigger]);

    const contentHeader = (
        <PageContentRow><div className='flex items-center justify-between py-2'>
            <div className='flex'>
                {!isOwnProfile && (
                    <UserIdentity username={username} avatar={avatar} size={40} />
                )}
                {isOwnProfile && !horizontalLayout && CONTENT_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            if (tab.value === activeTab) {
                                tab.value === 'images' ? setUploadTrigger(n => n + 1) : setEntryTrigger(n => n + 1);
                            } else {
                                setActiveTab(tab.value);
                            }
                        }}
                        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 font-medium rounded-full transition-colors cursor-pointer ${
                            activeTab === tab.value
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <div className='relative'>
                            <tab.icon className='w-5 h-5 shrink-0' />
                            {tab.value === activeTab && (
                                <span className='absolute -top-1 -right-1 w-3 h-3 bg-white text-blue-600 rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>+</span>
                            )}
                        </div>
                        <span className='text-xs hidden min-[360px]:block'>{tab.label}</span>
                    </button>
                ))}
            </div>
            <div className='flex items-center gap-2'>
            {!isOwnProfile && (
                <FriendshipButton userId={userId} username={username} />
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
