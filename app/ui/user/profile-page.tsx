// app/ui/user/profile-page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContent, PageContentRow, PageContentList } from '@iam/ui';
import { useFooter } from '@/app/lib/providers/footer-provider';
import EntryList from '@/app/ui/user/entry-list';
import ImagesClient from '@/app/ui/images/images-client';
import FriendsView from '@/app/friends/friends-view';
import FriendshipButton from '@/app/ui/friendship/friendship-button';
import UserIdentity from '@/app/ui/user/user-identity';
import FindOrInviteForm from '@/app/ui/find-or-invite-form';
import { getPendingRequests } from '@/app/lib/actions/friendships';
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents';
import { MemoriesIcon, PostsIcon, ImagesIcon, FriendsIcon, SettingsIcon } from '@/app/ui/icons/tab-icons';
import SignOutButton from '@/app/ui/auth/signout-button';
import DeleteAccountSection from '@/app/settings/delete-account-section';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { FriendRequestPayload } from '@/app/lib/socket/events';
import type { Image as ImageType } from '@/app/lib/definitions/image';

type Tab = 'posts' | 'memories' | 'images' | 'friends' | 'settings';

const CONTENT_TABS: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'posts', label: 'Posts', icon: PostsIcon },
    { value: 'memories', label: 'Memories', icon: MemoriesIcon },
    { value: 'images', label: 'Images', icon: ImagesIcon },
    { value: 'friends', label: 'Friends', icon: FriendsIcon },
    { value: 'settings', label: 'Settings', icon: SettingsIcon },
];

const VALID_TABS = new Set<Tab>(['posts', 'memories', 'images', 'friends', 'settings']);

interface ProfilePageProps {
    username: string;
    userId: string;
    isOwnProfile: boolean;
    initialContent: ContentItem[];
    avatar?: ImageType | null;
}

export default function ProfilePage({ username, userId, isOwnProfile, initialContent, avatar }: ProfilePageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawTab = searchParams.get('t') as Tab | null;
    const activeTab: Tab = rawTab && VALID_TABS.has(rawTab) ? rawTab : 'posts';
    const [entryTrigger, setEntryTrigger] = useState(0);
    const [uploadTrigger, setUploadTrigger] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const { setFooter } = useFooter();

    useEffect(() => {
        if (!isOwnProfile) return;
        getPendingRequests().then(r => setPendingCount(r.length)).catch(() => {});
    }, [isOwnProfile]);

    useFriendshipSocketEvents({
        isCurrentUser: isOwnProfile,
        onFriendRequestSent: (_payload: FriendRequestPayload) => setPendingCount(n => n + 1),
    });

    useEffect(() => {
        if (!isOwnProfile) {
            setFooter(null);
            return;
        }
        setFooter(
            <nav className='flex flex-col gap-1 p-2 pt-4 @min-[220px]:flex-row @min-[220px]:justify-around @min-[220px]:gap-0 @min-[220px]:p-1'>
                {CONTENT_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => {
                            if (tab.value === activeTab) {
                                if (tab.value === 'images') setUploadTrigger(n => n + 1);
                                else if (tab.value !== 'friends' && tab.value !== 'settings') setEntryTrigger(n => n + 1);
                            } else {
                                router.push(`?t=${tab.value}`, { scroll: false });
                            }
                        }}
                        className={`flex flex-1 flex-col items-center gap-0.5 py-3 @min-[220px]:py-1.5 font-medium transition-colors cursor-pointer ${
                            activeTab === tab.value
                                ? 'text-blue-600'
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <div className='relative'>
                            <tab.icon className='w-6 h-6 shrink-0' />
                            {tab.value === activeTab && tab.value !== 'friends' && tab.value !== 'settings' && (
                                <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>+</span>
                            )}
                            {tab.value === 'friends' && pendingCount > 0 && (
                                <span className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>{pendingCount > 9 ? '9+' : pendingCount}</span>
                            )}
                        </div>
                        <span className={`text-xs hidden @[120px]:block ${tab.value === activeTab ? 'visible' : 'invisible'}`}>{tab.label}</span>
                    </button>
                ))}
            </nav>
        );
        return () => setFooter(null);
    }, [isOwnProfile, activeTab, pendingCount, router, setFooter, setEntryTrigger, setUploadTrigger]);

    const contentHeader = isOwnProfile ? null : (
        <PageContentRow>
            <div className='flex items-center justify-between'>
                <UserIdentity username={username} avatar={avatar} size={40} />
                <div className='flex items-center gap-2'>
                    <FriendshipButton userId={userId} username={username} />
                </div>
            </div>
        </PageContentRow>
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
            {activeTab === 'settings' && (
                <PageContentList>
                    <div className='flex flex-col gap-6 py-4'>
                        <div className='flex flex-col gap-2'>
                            <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>Account</h3>
                            <SignOutButton variant='labeled' />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>Danger zone</h3>
                            <DeleteAccountSection />
                        </div>
                    </div>
                </PageContentList>
            )}
        </PageContent>
    );
}
