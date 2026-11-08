// app/ui/user/entry-list.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { Entry } from '@/app/lib/definitions/entry';
import type { Image } from '@/app/lib/definitions/image';
import { Modal } from '@iam/ui';
import ContentItemCard from '@/app/ui/content-item-card';
import CreateEntryForm from '@/app/ui/entries/create-entry-form';
import Lightbox from '@/app/ui/lightbox';
import ImageModalMenu from '@/app/ui/images/image-modal-menu';
import { useUser } from '@/app/lib/providers/user-provider';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { getCommentCountsForItems } from '@/app/lib/actions/comments';
import { filterCommentableContent, isImage } from '@/app/lib/utils/content-helpers';
import { useCommentCountSocket } from '@/app/lib/hooks/use-comment-count-socket';

type ContentType = 'post' | 'memory';

interface EntryListProps {
    initialContent: ContentItem[];
    editable?: boolean;
    contentType?: ContentType;
    triggerAdd?: number;
}

const FILTER_OPTIONS: { type: ContentType; label: string }[] = [
    { type: 'post', label: 'Posts' },
    { type: 'memory', label: 'Memories' },
];

export default function EntryList({ initialContent, editable = false, contentType, triggerAdd }: EntryListProps) {
    const { user } = useUser();
    const { socket } = useSocket();
    const [content, setContent] = useState<ContentItem[]>(initialContent);
    const [filters, setFilters] = useState<Record<ContentType, boolean>>({ post: true, memory: true });
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Entry | undefined>(undefined);
    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [openWithComments, setOpenWithComments] = useState(false);

    useEffect(() => {
        const fetchCommentCounts = async () => {
            const itemIds = filterCommentableContent(initialContent).map(item => item.id);
            if (itemIds.length === 0) return;
            try {
                const counts = await getCommentCountsForItems(itemIds);
                setContent(prev => prev.map(item => ({
                    ...item,
                    commentCount: counts[item.id] ?? item.commentCount ?? 0,
                })));
            } catch {
                // comment counts are non-critical
            }
        };
        fetchCommentCounts();
    }, []);

    useCommentCountSocket(socket, setContent);

    useEffect(() => {
        if (triggerAdd) {
            setEditingItem(undefined);
            setModalOpen(true);
        }
    }, [triggerAdd]);

    const toggleFilter = (type: ContentType) =>
        setFilters(prev => ({ ...prev, [type]: !prev[type] }));

    const isCurrentUserAuthor = (item: ContentItem) => {
        if (!user?.id) return false;
        if (isImage(item)) return item.userId === user.id;
        return item.author.id === user.id;
    };

    const handleDeleted = (id: string) =>
        setContent(prev => prev.filter(item => item.id !== id));

    const handleEdit = (item: Entry) => {
        setEditingItem(item);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingItem(undefined);
    };

    const handleEntrySuccess = (entry: Entry) => {
        setContent(prev =>
            editingItem
                ? prev.map(item => item.id === entry.id ? entry : item)
                : [entry, ...prev]
        );
        handleCloseModal();
    };

    const handleCloseLightbox = useCallback(() => {
        setSelectedImage(null);
        setOpenWithComments(false);
    }, []);

    const handleCommentImageClick = useCallback((image: Image) => {
        setOpenWithComments(true);
        setSelectedImage(image);
    }, []);

    const handleImageLikeChange = useCallback((newLiked: boolean) => {
        setSelectedImage(prev => prev ? {
            ...prev,
            likedByCurrentUser: newLiked,
            likes: newLiked
                ? [...(prev.likes || []), user?.id || '']
                : (prev.likes || []).filter(id => id !== user?.id),
        } : null);
    }, [user?.id]);

    const handleImageDeleted = useCallback(() => {
        if (!selectedImage) return;
        setContent(prev => prev.filter(item => item.id !== selectedImage.id));
        handleCloseLightbox();
    }, [selectedImage, handleCloseLightbox]);

    const filteredContent = filterCommentableContent(content).filter(item =>
        contentType
            ? item.contentType === contentType
            : (filters[item.contentType as ContentType] ?? true)
    );

    return (
        <div className='w-full max-w-[600px] pb-4'>
            {!contentType && (
                <div className='flex items-center gap-4 mb-4'>
                    {FILTER_OPTIONS.map(({ type, label }) => (
                        <label key={type} className='flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none'>
                            <input
                                type='checkbox'
                                checked={filters[type]}
                                onChange={() => toggleFilter(type)}
                                className='rounded border-gray-300 text-blue-600'
                            />
                            {label}
                        </label>
                    ))}
                </div>
            )}

            <div className='space-y-4'>
                {filteredContent.length === 0 ? (
                    <p className='text-gray-500'>No content to display</p>
                ) : (
                    filteredContent.map(item => (
                        <ContentItemCard
                            key={`${item.contentType}-${item.id}`}
                            item={item}
                            editable={editable && isCurrentUserAuthor(item)}
                            onDeleted={handleDeleted}
                            onEdit={handleEdit}
                            onImageClick={setSelectedImage}
                            onCommentImageClick={handleCommentImageClick}
                        />
                    ))
                )}
            </div>

            {modalOpen && (
                <Modal isOpen onClose={handleCloseModal}>
                    <div className='flex items-center justify-between mb-4'>
                        <h1 className='text-2xl font-semibold text-gray-900'>
                            {editingItem ? `Edit ${editingItem.contentType}` : 'New Entry'}
                        </h1>
                        <button
                            onClick={handleCloseModal}
                            className='text-gray-500 hover:text-gray-700 text-2xl leading-none cursor-pointer'
                            aria-label='Close'
                        >✕</button>
                    </div>
                    <CreateEntryForm
                        onSuccess={handleEntrySuccess}
                        onClose={handleCloseModal}
                        editItem={editingItem}
                    />
                </Modal>
            )}

            {selectedImage && (
                <Lightbox
                    src={selectedImage.variants.find(v => v.size === 'original')?.url || selectedImage.variants[0].url}
                    alt={selectedImage.alt || 'Image'}
                    onClose={handleCloseLightbox}
                >
                    <ImageModalMenu
                        imageId={selectedImage.id}
                        currentUserId={user?.id}
                        currentUserRole={user?.role}
                        initialLiked={selectedImage.likedByCurrentUser}
                        initialLikeCount={selectedImage.likes?.length || 0}
                        initialCommentCount={selectedImage.commentCount || 0}
                        authorized={selectedImage.userId === user?.id}
                        isAvatar={user?.avatar?.id === selectedImage.id}
                        initialExpanded={openWithComments}
                        onDeleted={handleImageDeleted}
                        onLikeChange={handleImageLikeChange}
                    />
                </Lightbox>
            )}
        </div>
    );
}
