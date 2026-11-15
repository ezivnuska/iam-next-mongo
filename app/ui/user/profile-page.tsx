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
import { MemoriesIcon, PostsIcon, ImagesIcon, FriendsIcon } from '@/app/ui/icons/tab-icons';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { FriendRequestPayload } from '@/app/lib/socket/events';
import type { Image as ImageType } from '@/app/lib/definitions/image';

type Tab = 'posts' | 'memories' | 'images' | 'friends';

const CONTENT_TABS: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'posts', label: 'Posts', icon: PostsIcon },
    { value: 'memories', label: 'Memories', icon: MemoriesIcon },
    { value: 'images', label: 'Images', icon: ImagesIcon },
    { value: 'friends', label: 'Friends', icon: FriendsIcon },
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
                                    if (tab.value === 'images') setUploadTrigger(n => n + 1);
                                    else if (tab.value !== 'friends') setEntryTrigger(n => n + 1);
                                } else {
                                    setActiveTab(tab.value);
                                }
                            }}
                            className={`w-full py-3 font-medium transition-colors flex flex-col items-center gap-1.5 cursor-pointer ${
                                activeTab === tab.value
                                    ? 'text-blue-600'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <div className='relative'>
                                <tab.icon className='w-6 h-6 shrink-0' />
                                {tab.value === activeTab && tab.value !== 'friends' && (
                                    <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>+</span>
                                )}
                                {tab.value === 'friends' && pendingCount > 0 && (
                                    <span className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>{pendingCount > 9 ? '9+' : pendingCount}</span>
                                )}
                            </div>
                            <span className={`text-xs hidden @[120px]:block ${tab.value === activeTab ? 'visible' : 'invisible'}`}>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
        return () => setRightPanel(null);
    }, [isOwnProfile, horizontalLayout, activeTab, pendingCount, setRightPanel, setEntryTrigger, setUploadTrigger]);

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
                                if (tab.value === 'images') setUploadTrigger(n => n + 1);
                                else if (tab.value !== 'friends') setEntryTrigger(n => n + 1);
                            } else {
                                setActiveTab(tab.value);
                            }
                        }}
                        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                            activeTab === tab.value
                                ? 'text-blue-600'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <div className='relative'>
                            <tab.icon className='w-5 h-5 shrink-0' />
                            {tab.value === activeTab && tab.value !== 'friends' && (
                                <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>+</span>
                            )}
                            {tab.value === 'friends' && pendingCount > 0 && (
                                <span className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>{pendingCount > 9 ? '9+' : pendingCount}</span>
                            )}
                        </div>
                        <span className={`text-xs ${tab.value === activeTab ? 'visible' : 'invisible'}`}>{tab.label}</span>
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
            {activeTab === 'friends' && (
                <PageContentList>
                    <FindOrInviteForm />
                    <FriendsView />
                </PageContentList>
            )}
        </PageContent>
    );
}
