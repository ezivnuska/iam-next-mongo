// app/ui/user/profile-page.tsx

'use client';

import { useState } from 'react';
import { PageContent, PageContentRow, PageContentList } from '@iam/ui';
import EntryList from '@/app/ui/user/entry-list';
import UserBio from '@/app/ui/user/user-bio';
import UserProfileCard from '@/app/ui/user/user-profile-card';
import ImagesClient from '@/app/ui/images/images-client';
import { useUser } from '@/app/lib/providers/user-provider';
import type { ContentItem } from '@/app/lib/definitions/content';

type Tab = 'posts' | 'memories' | 'images' | 'details';

const TABS: { value: Tab; label: string }[] = [
    { value: 'posts', label: 'Posts' },
    { value: 'memories', label: 'Memories' },
    { value: 'images', label: 'Images' },
    { value: 'details', label: 'Details' },
];

interface ProfilePageProps {
    username: string;
    userId: string;
    isOwnProfile: boolean;
    initialContent: ContentItem[];
}

export default function ProfilePage({ username, userId, isOwnProfile, initialContent }: ProfilePageProps) {
    const [activeTab, setActiveTab] = useState<Tab>('posts');
    const [entryTrigger, setEntryTrigger] = useState(0);
    const [uploadTrigger, setUploadTrigger] = useState(0);
    const { user } = useUser();

    const showAddEntry = isOwnProfile && (activeTab === 'posts' || activeTab === 'memories');
    const showUpload = isOwnProfile && activeTab === 'images';

    const header = (
        <PageContentRow><div className='flex items-center justify-between py-2'>
            <div className='flex'>
                {TABS.map(tab => (
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
                <PageContentRow className='py-4'>
                    <ImagesClient
                        userId={userId}
                        authorized={isOwnProfile}
                        triggerUpload={uploadTrigger}
                    />
                </PageContentRow>
            )}
            {activeTab === 'details' && (
                <PageContentList>
                    {isOwnProfile
                        ? <UserBio bio={user?.bio} editable />
                        : <UserProfileCard username={username} />
                    }
                </PageContentList>
            )}
        </PageContent>
    );
}
