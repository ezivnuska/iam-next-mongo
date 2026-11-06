// app/ui/content-detail-view.tsx

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { Entry } from '@/app/lib/definitions/entry';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import UnifiedUserHeader from './user/unified-user-header';
import ContentImage from './content-image';
import LikeButton from './like-button';
import CommentFormModal from './comments/comment-form-modal';
import CommentSection from './comments/comment-section';
import { useComments } from '@/app/lib/hooks/use-comments';
import { useUser } from '@/app/lib/providers/user-provider';
import { CommentIcon } from '@iam/ui';
import type { CommentRefType } from '@/app/lib/definitions/comment';
import { toCommentRefType, getContentImageUrl, getContentImageAlt, getContentImage } from '@/app/lib/utils/content-helpers';

interface ContentDetailViewProps {
    item: Entry;
}

export default function ContentDetailView({ item }: ContentDetailViewProps) {
    const { user } = useUser();
    const [showCommentForm, setShowCommentForm] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const previousCountRef = useRef(item.commentCount || 0);

    const refType: CommentRefType = toCommentRefType(item.contentType);

    const handleCommentCountChange = useCallback((count: number) => {
        previousCountRef.current = count;
    }, []);

    const {
        comments,
        commentCount,
        loadingComments,
        deleteComment,
        createComment,
    } = useComments({
        itemId: item.id,
        itemType: refType,
        initialCommentCount: item.commentCount || 0,
        currentUserId: user?.id,
        onCommentCountChange: handleCommentCountChange,
        autoLoad: true,
    });

    const handleOpenCommentForm = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowCommentForm(true);
    };

    const handleCommentSubmit = async (content: string) => {
        await createComment(content);
        setShowCommentForm(false);
    };

    const handleImageClick = (image: ImageType | null | undefined) => {
        if (image) setShowImageModal(true);
    };

    const closeImageModal = () => setShowImageModal(false);

    useEffect(() => {
        if (!showImageModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); closeImageModal(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showImageModal]);

    return (
        <div className='flex flex-col gap-2'>
            <UnifiedUserHeader
                user={item.author}
                avatar={item.author.avatar}
                timestamp={item.createdAt}
                avatarSize={40}
                clickable
            />

            <div className='flex flex-col flex-1'>
                {item.contentType === 'memory' && (
                    <div className='flex flex-1 flex-col gap-2'>
                        <div className='flex flex-1 flex-col gap-2'>
                            <p className='text-lg font-bold text-gray-900'>
                                {item.date ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                            </p>
                            {item.title && <p className='text-lg font-light text-gray-600'>{item.title}</p>}
                        </div>
                        <ContentImage
                            image={item.image}
                            alt='Memory image'
                            className='max-w-full max-h-96 rounded object-cover cursor-pointer'
                            onClick={item.image ? () => handleImageClick(item.image) : undefined}
                        />
                        {item.content && <p className='whitespace-pre-wrap text-gray-900'>{item.content}</p>}
                    </div>
                )}

                {item.contentType === 'post' && (
                    <div className='flex flex-1 gap-2'>
                        <ContentImage
                            image={item.image}
                            alt='Post image'
                            className='rounded object-cover cursor-pointer'
                            onClick={item.image ? () => handleImageClick(item.image) : undefined}
                        />
                        {item.content && (
                            <div className='text-gray-900'>
                                <p>{item.content}</p>
                                {item.linkUrl && (
                                    <a href={item.linkUrl} target='_blank' className='text-blue-500 underline mt-2 block'>
                                        [source]
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className='flex flex-row items-center gap-2 text-sm text-gray-600'>
                    <LikeButton
                        itemId={item.id}
                        itemType={refType}
                        initialLiked={item.likedByCurrentUser}
                        initialLikeCount={item.likes?.length || 0}
                    />
                    <button
                        className='flex items-center gap-2 rounded transition-colors cursor-pointer'
                        onClick={handleOpenCommentForm}
                        aria-label='Add comment'
                    >
                        <CommentIcon className='w-5 h-5 text-gray-600 hover:text-blue-300' />
                    </button>
                    <span className='text-sm font-medium text-gray-700'>{commentCount}</span>
                </div>

                <div className='pb-4'>
                    <CommentSection
                        comments={comments}
                        loading={loadingComments}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        onDelete={deleteComment}
                    />
                </div>
            </div>

            {showImageModal && getContentImage(item) && (
                <div
                    className='fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50'
                    onClick={closeImageModal}
                >
                    <div className='relative max-w-5xl w-full h-full flex items-center justify-center p-4'>
                        <Image
                            src={getContentImageUrl(item) || ''}
                            alt={getContentImageAlt(item, 'Full image')}
                            fill
                            style={{ objectFit: 'contain' }}
                            sizes='100vw'
                        />
                        <button
                            className='absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow text-black z-10'
                            onClick={closeImageModal}
                        >✕</button>
                    </div>
                </div>
            )}

            <CommentFormModal
                isOpen={showCommentForm}
                onClose={() => setShowCommentForm(false)}
                refId={item.id}
                refType={refType}
                onSubmit={handleCommentSubmit}
            />
        </div>
    );
}
