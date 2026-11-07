// app/ui/content-card.tsx

'use client';

import { useRouter } from 'next/navigation';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import UnifiedUserHeader from './user/unified-user-header';

interface ContentCardProps {
    author: { id: string; username: string };
    avatar?: ImageType | null;
    createdAt: string;
    href?: string;
    actions?: {
        onDelete?: () => Promise<void>;
        onFlag?: () => void;
        canDelete?: boolean;
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

    if (compact) {
        return (
            <div
                className={`flex flex-row items-start gap-3${href ? ' cursor-pointer' : ''}`}
                onClick={handleCardClick}
            >
                {thumbnail && <div className='shrink-0'>{thumbnail}</div>}
                <div className='flex flex-col flex-1 min-w-0'>
                    <div onClick={e => e.stopPropagation()}>
                        <UnifiedUserHeader
                            user={author}
                            avatar={avatar}
                            onFlag={actions?.onFlag}
                            onDelete={actions?.onDelete}
                            canDelete={actions?.canDelete}
                            avatarSize={28}
                            variant='compact'
                            clickable
                        />
                    </div>
                    <div className='flex-1 min-w-0'>{children}</div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col${href ? ' cursor-pointer' : ''}`}
            onClick={handleCardClick}
        >
            <div onClick={e => e.stopPropagation()}>
                <UnifiedUserHeader
                    user={author}
                    avatar={avatar}
                    onFlag={actions?.onFlag}
                    onDelete={actions?.onDelete}
                    canDelete={actions?.canDelete}
                    avatarSize={36}
                    clickable
                />
            </div>

            <div className='flex flex-col flex-1'>
                {children}
            </div>
        </div>
    );
}
