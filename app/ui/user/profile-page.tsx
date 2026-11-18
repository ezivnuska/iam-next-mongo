// app/ui/user/profile-page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContent, PageContentRow, PageContentList, PageHeader, useHorizontalLayout } from '@iam/ui';
import { useFooter } from '@/app/lib/providers/footer-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import EntryList from '@/app/ui/user/entry-list';
import ImagesClient from '@/app/ui/images/images-client';
import FriendsView from '@/app/friends/friends-view';
import FriendshipButton from '@/app/ui/friendship/friendship-button'
import MessageButton from '@/app/ui/messages/message-button';
import UserIdentity from '@/app/ui/user/user-identity';
import FindOrInviteForm from '@/app/ui/find-or-invite-form';
import { getPendingRequests } from '@/app/lib/actions/friendships';
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents';
import { MemoriesIcon, PostsIcon, ImagesIcon, FriendsIcon, SettingsIcon } from '@/app/ui/icons/tab-icons';
import SignOutButton from '@/app/ui/auth/signout-button';
import DeleteAccountSection from '@/app/settings/delete-account-section';
import AdminDeleteButton from '@/app/settings/admin-delete-button';
import { UserRole } from '@iam/shared-types';
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

const ALL_VALID_TABS = new Set(CONTENT_TABS.map(t => t.value));

interface ProfilePageProps {
    username: string;
    userId: string;
    isOwnProfile: boolean;
    initialContent: ContentItem[];
    avatar?: ImageType | null;
}

export default function ProfilePage({ username, userId, isOwnProfile, initialContent, avatar }: ProfilePageProps) {
    const router = useRouter();
    const { user: currentUser } = useUser();
    const isAdmin = currentUser?.role === UserRole.Admin;
    const isLandscape = useHorizontalLayout() === true;
    const searchParams = useSearchParams();
    const rawTab = searchParams.get('t') as Tab | null;
    const activeTab: Tab = isOwnProfile && rawTab && ALL_VALID_TABS.has(rawTab) ? rawTab : 'posts';
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
            <nav className={`flex flex-col gap-2 @min-[220px]:flex-row @min-[220px]:justify-around @min-[220px]:gap-2 ${isLandscape ? 'px-1 py-2 gap-1' : 'p-2 py-1.5 @min-[220px]:px-2 @min-[220px]:py-1.5'}`}>
                {CONTENT_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => { if (tab.value !== activeTab) router.push(`?t=${tab.value}`, { scroll: false }); }}
                        className={`flex flex-1 items-center font-medium transition-colors cursor-pointer ${isLandscape ? 'flex-row justify-start gap-2 px-1.5 py-2 rounded-lg' : 'flex-col justify-center gap-0.5 py-3 rounded-lg @min-[220px]:py-1.5'} ${
                            activeTab === tab.value
                                ? 'text-white bg-gray-700'
                                : 'text-white hover:bg-white/10 active:bg-white/20'
                        }`}
                    >
                        <div className='relative shrink-0'>
                            <tab.icon className={isLandscape ? 'w-5 h-5' : 'w-6 h-6'} />
                            {tab.value === 'friends' && pendingCount > 0 && (
                                <span className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>{pendingCount > 9 ? '9+' : pendingCount}</span>
                            )}
                        </div>
                        <span className={`text-xs ${isLandscape ? '' : 'hidden min-[375px]:block'}`}>{tab.label}</span>
                    </button>
                ))}
            </nav>
        );
        return () => setFooter(null);
    }, [isOwnProfile, activeTab, pendingCount, router, setFooter, isLandscape]);

    const activeTabLabel = CONTENT_TABS.find(t => t.value === activeTab)?.label ?? '';

    let headerActions: React.ReactNode;
    if (isOwnProfile) {
        if (activeTab === 'settings') {
            headerActions = <SignOutButton variant='labeled' />;
        } else if (activeTab === 'posts' || activeTab === 'memories') {
            headerActions = (
                <button
                    onClick={() => setEntryTrigger(n => n + 1)}
                    className='px-3 py-1.5 text-sm font-semibold text-white border border-white/50 rounded-lg hover:border-white hover:bg-white/10 transition-colors cursor-pointer'
                >
                    + Add
                </button>
            );
        } else if (activeTab === 'images') {
            headerActions = (
                <button
                    onClick={() => setUploadTrigger(n => n + 1)}
                    className='px-3 py-1.5 text-sm font-semibold text-white border border-white/50 rounded-lg hover:border-white hover:bg-white/10 transition-colors cursor-pointer'
                >
                    + Upload
                </button>
            );
        }
    }

    const contentHeader = isOwnProfile ? (
        <PageHeader subtitle={activeTabLabel} actions={headerActions} />
    ) : (
        <PageContentRow className='py-4 border-b border-gray-200'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 text-gray-900'>
                    <UserIdentity username={username} avatar={avatar} size={40} />
                    {isAdmin && <AdminDeleteButton userId={userId} username={username} />}
                </div>
                <div className='flex items-center gap-2'>
                    <MessageButton userId={userId} username={username} />
                    <FriendshipButton userId={userId} username={username} />
                </div>
            </div>
        </PageContentRow>
    );

    return (
        <PageContent header={contentHeader}>
            {(activeTab === 'posts' || activeTab === 'memories') && (
                <PageContentList>
                    <EntryList
                        initialContent={initialContent}
                        editable={isOwnProfile}
                        contentType={activeTab === 'posts' ? 'post' : 'memory'}
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
                    {isOwnProfile && <FindOrInviteForm />}
                    <FriendsView userId={userId} isOwnProfile={isOwnProfile} />
                </PageContentList>
            )}
            {activeTab === 'settings' && (
                <PageContentList>
                    <div className='flex flex-col gap-2 py-2 px-4'>
                        <h3 className='text-sm font-semibold text-gray-500 uppercase tracking-wide'>Delete Account</h3>
                        <DeleteAccountSection />
                    </div>
                </PageContentList>
            )}
        </PageContent>
    );
}
