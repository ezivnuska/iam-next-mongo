'use client';

import ContentImage from '@/app/ui/content-image';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface MemoryContentProps {
    date?: string;
    title?: string;
    content?: string;
    image?: ImageType | null;
    onImageClick?: () => void;
    variant?: 'list' | 'compact' | 'detail';
}

export default function MemoryContent({
    date,
    title,
    content,
    image,
    onImageClick,
    variant = 'list',
}: MemoryContentProps) {
    const memoryDate = date
        ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
    const isDetail = variant === 'detail';
    const isCompact = variant === 'compact';

    return (
        <div className='flex flex-col gap-1 min-w-0'>
            {memoryDate && (
                <p className={`font-bold text-gray-900${isDetail ? ' text-lg' : ' text-sm'}${isCompact ? ' truncate' : ''}`}>
                    {memoryDate}
                </p>
            )}
            {title && (
                <p className={`font-semibold text-gray-600${isDetail ? ' text-base' : ' text-sm'}${isCompact ? ' truncate' : ''}`}>
                    {title}
                </p>
            )}
            {isDetail && content && (
                <p className='whitespace-pre-wrap font-normal text-gray-900'>
                    {content}
                </p>
            )}
            {!isCompact && (
                <ContentImage
                    image={image}
                    alt='Memory image'
                    className={isDetail
                        ? 'max-w-full max-h-96 rounded object-cover cursor-pointer'
                        : 'rounded mt-2 object-cover'}
                    onClick={onImageClick}
                />
            )}
        </div>
    );
}
