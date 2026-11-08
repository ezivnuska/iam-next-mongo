// app/ui/user/profile-page.tsx

'use client';

import { useState } from 'react';
import { PageContent } from '@iam/ui';
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
        <div className='flex items-center justify-between py-2'>
            <div className='flex'>
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            activeTab === tab.value
                                ? 'bg-blue-600 text-white cursor-default'
                                : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {showAddEntry && (
                <button
                    onClick={() => setEntryTrigger(n => n + 1)}
                    className='px-4 py-1.5 text-sm font-medium rounded-full text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer'
                >
                    + New Entry
                </button>
            )}
            {showUpload && (
                <button
                    onClick={() => setUploadTrigger(n => n + 1)}
                    className='px-4 py-1.5 text-sm font-medium rounded-full text-blue-600 hover:bg-gray-100 transition-colors cursor-pointer'
                >
                    Upload File
                </button>
            )}
        </div>
    );

    return (
        <PageContent header={header}>
            {activeTab === 'posts' && (
                <EntryList
                    initialContent={initialContent}
                    editable={isOwnProfile}
                    contentType='post'
                    triggerAdd={entryTrigger}
                />
            )}
            {activeTab === 'memories' && (
                <EntryList
                    initialContent={initialContent}
                    editable={isOwnProfile}
                    contentType='memory'
                    triggerAdd={entryTrigger}
                />
            )}
            {activeTab === 'images' && (
                <ImagesClient
                    userId={userId}
                    authorized={isOwnProfile}
                    triggerUpload={uploadTrigger}
                />
            )}
            {activeTab === 'details' && (
                isOwnProfile
                    ? <UserBio bio={user?.bio} editable />
                    : <UserProfileCard username={username} />
            )}
        </PageContent>
    );
}
