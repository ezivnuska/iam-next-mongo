// app/ui/content-card.tsx

'use client';

import { useRouter } from 'next/navigation';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import EntryHeader from './user/entry-header';
import FlagContentButton from './flag-content-button';

interface ContentCardProps {
    author: { id: string; username: string };
    avatar?: ImageType | null;
    createdAt: string;
    href?: string;
    actions?: {
        onFlag?: () => void;
    };
    compact?: boolean;
    thumbnail?: React.ReactNode;
    children: React.ReactNode;
}

export default function ContentCard({
    author,
    avatar,
    createdAt,
    href,
    actions,
    compact = false,
    thumbnail,
    children,
}: ContentCardProps) {
    const router = useRouter();

    const handleCardClick = href ? () => router.push(href) : undefined;

    const actionsNode = actions?.onFlag && (
        <div className='flex items-center shrink-0' onClick={e => e.stopPropagation()}>
            <FlagContentButton onFlag={actions.onFlag} />
        </div>
    );

    if (compact) {
        return (
            <div
                className={`flex flex-col gap-1${href ? ' cursor-pointer' : ''}`}
                onClick={handleCardClick}
            >
                {/* Row 1: header + actions (left), thumbnail (right) */}
                <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-start gap-2 min-w-0 flex-1'>
                        <EntryHeader
                            username={author.username}
                            avatar={avatar}
                            avatarSize={36}
                            createdAt={createdAt}
                        />
                        {actionsNode}
                    </div>
                    <div className='w-[84px] shrink-0'>{thumbnail}</div>
                </div>

                {/* Row 2: content */}
                <div className='min-w-0'>{children}</div>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col${href ? ' cursor-pointer' : ''}`}
            onClick={handleCardClick}
        >
            <div className='flex items-center justify-between'>
                <EntryHeader
                    username={author.username}
                    avatar={avatar}
                    avatarSize={36}
                    createdAt={createdAt}
                />
                {actionsNode}
            </div>

            <div className='flex flex-col flex-1'>
                {children}
            </div>
        </div>
    );
}
