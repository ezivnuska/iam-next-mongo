'use client';

import Link from 'next/link';

type ContentTab = 'post' | 'memory';
type AnyTab = ContentTab | 'images';

interface ProfileTabBarProps {
    username: string;
    activeTab: AnyTab;
    isOwnProfile?: boolean;
    onTabChange?: (tab: ContentTab) => void;
}

const CONTENT_TABS: { label: string; value: ContentTab; ownOnly: boolean }[] = [
    { label: 'Posts', value: 'post', ownOnly: false },
    { label: 'Memories', value: 'memory', ownOnly: true },
];

export default function ProfileTabBar({ username, activeTab, isOwnProfile, onTabChange }: ProfileTabBarProps) {
    const onImagesPage = activeTab === 'images';
    const profileHref = `/users/${username}`;
    const imagesHref = `/users/${username}/images`;

    return (
        <div className='flex gap-2 border-b mb-4'>
            {CONTENT_TABS
                .filter(tab => !tab.ownOnly || isOwnProfile)
                .map(tab => {
                    const isActive = !onImagesPage && activeTab === tab.value;
                    const className = `px-4 py-2 font-medium transition-colors ${
                        isActive
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                    }`;
                    if (onImagesPage) {
                        return <Link key={tab.value} href={profileHref} className={className}>{tab.label}</Link>;
                    }
                    return (
                        <button key={tab.value} className={className} onClick={() => onTabChange?.(tab.value)}>
                            {tab.label}
                        </button>
                    );
                })}

            {isOwnProfile && (
                <Link
                    href={imagesHref}
                    className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === 'images'
                            ? 'border-b-2 border-blue-600 text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Images
                </Link>
            )}
        </div>
    );
}
