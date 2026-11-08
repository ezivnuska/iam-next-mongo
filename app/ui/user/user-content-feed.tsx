// app/ui/user/user-content-feed.tsx

'use client';

import Link from 'next/link';
import type { ContentItem } from '@/app/lib/definitions/content';
import EntryList from '@/app/ui/user/entry-list';

interface UserContentFeedProps {
    initialContent: ContentItem[];
    editable?: boolean;
    username?: string;
}

export default function UserContentFeed({ initialContent, editable = false, username }: UserContentFeedProps) {
    return (
        <div className='w-full max-w-[600px]'>
            {username && editable && (
                <div className='flex justify-end mb-2'>
                    <Link
                        href={`/users/${username}/images`}
                        className='text-sm text-gray-500 hover:text-gray-900 transition-colors'
                    >
                        Images →
                    </Link>
                </div>
            )}
            <EntryList initialContent={initialContent} editable={editable} />
        </div>
    );
}
