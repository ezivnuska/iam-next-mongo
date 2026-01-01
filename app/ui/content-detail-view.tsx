// app/ui/content-detail-view.tsx

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { Post } from '@/app/lib/definitions/post';
import type { Memory } from '@/app/lib/definitions/memory';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import UnifiedUserHeader from './user/unified-user-header';
import ContentImage from './content-image';
import LikeButton from './like-button';
import CommentFormModal from './comments/comment-form-modal';
import CommentSection from './comments/comment-section';
import { useComments } from '@/app/lib/hooks/use-comments';
import { useUser } from '@/app/lib/providers/user-provider';
import { useIsDark } from '@/app/lib/hooks/use-is-dark';
import { getTextColor, getMutedTextColor } from '@/app/lib/utils/theme-colors';
import { CommentIcon } from './icons';
import type { CommentRefType } from '@/app/lib/definitions/comment';
import { toCommentRefType, isMemory, isPost, getContentImageUrl, getContentImageAlt, getContentImage } from '@/app/lib/utils/content-helpers';

// Only accept Post or Memory, not Image
type DetailViewContent =
    | (Post & { contentType: 'post' })
    | (Memory & { contentType: 'memory' });

interface ContentDetailViewProps {
    item: DetailViewContent;
}

export default function ContentDetailView({ item }: ContentDetailViewProps) {
    const { user } = useUser();
    const isDark = useIsDark();
    const [showCommentForm, setShowCommentForm] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const previousCountRef = useRef(item.commentCount || 0);

    // Convert lowercase contentType to capitalized CommentRefType
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
        autoLoad: true, // Load comments immediately
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
        if (image) {
            setShowImageModal(true);
        }
    };

    const closeImageModal = () => {
        setShowImageModal(false);
    };

    // Keyboard handler for Escape key
    useEffect(() => {
        if (!showImageModal) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeImageModal();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showImageModal]);

    // Render memory-specific content
    const renderMemoryContent = () => {
        if (!isMemory(item)) return null;

        const memory = item;
        const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return (
            <div className='flex flex-1 flex-col gap-2'>
                <div className='flex flex-1 flex-col gap-2'>
                    <p className='text-lg font-bold' style={{ color: getTextColor(isDark) }}>
                        {memoryDate}
                    </p>
                    {memory.title && (
                        <p className='text-lg font-light' style={{ color: getMutedTextColor(isDark) }}>
                            {memory.title}
                        </p>
                    )}
                </div>
                
                <ContentImage
                    image={memory.image}
                    alt='Memory image'
                    className='max-w-full max-h-96 rounded object-cover cursor-pointer'
                    onClick={memory.image ? () => handleImageClick(memory.image) : undefined}
                />
                {memory.content && (
                    <p className='whitespace-pre-wrap' style={{ color: getTextColor(isDark) }}>
                        {memory.content}
                    </p>
                )}
            </div>
        );
    };

    // Render post-specific content
    const renderPostContent = () => {
        if (!isPost(item)) return null;

        const post = item;

        return (
            <div className='flex flex-1 gap-2'>
                <ContentImage
                    image={post.image}
                    alt='Post image'
                    className='rounded object-cover cursor-pointer'
                    onClick={post.image ? () => handleImageClick(post.image) : undefined}
                />
                {post.content && (
                    <div style={{ color: getTextColor(isDark) }}>
                        <p>{post.content}</p>
                        {post.linkUrl && (
                            <a href={post.linkUrl} target='_blank' className='text-blue-500 underline mt-2 block'>
                                [source]
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className='flex flex-col gap-2'>
            {/* Author header */}
            <UnifiedUserHeader
                user={item.author}
                avatar={item.author.avatar}
                timestamp={item.createdAt}
                avatarSize={40}
                clickable
            />

            {/* Content */}
            <div className='flex flex-col flex-1'>
                {isMemory(item) && renderMemoryContent()}
                {isPost(item) && renderPostContent()}

                {/* Interactions (Like + Comment button) */}
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
                    <span className='text-sm font-medium text-gray-700'>
                        {commentCount}
                    </span>
                </div>

                {/* Comments section - always visible */}
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

            {/* Image modal */}
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
                        {/* Close button */}
                        <button
                            className='absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow text-black z-10'
                            onClick={closeImageModal}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Comment form modal */}
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
