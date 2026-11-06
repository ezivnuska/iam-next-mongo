// app/ui/user/user-content-feed.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { Entry } from '@/app/lib/definitions/entry';
import type { Image } from '@/app/lib/definitions/image';
import { Button } from '@/app/ui/button';
import ContentItemCard from '@/app/ui/content-item-card';
import Modal from '@/app/ui/modal';
import CreateEntryForm from '@/app/ui/entries/create-entry-form';
import Lightbox from '@/app/ui/lightbox';
import ImageModalMenu from '@/app/ui/images/image-modal-menu';
import { useUser } from '@/app/lib/providers/user-provider';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { getCommentCountsForItems } from '@/app/lib/actions/comments';
import { filterCommentableContent, isImage } from '@/app/lib/utils/content-helpers';
import { useCommentCountSocket } from '@/app/lib/hooks/use-comment-count-socket';

interface UserContentFeedProps {
    initialContent: ContentItem[];
    editable?: boolean;
}

type ModalType = 'entry' | null;

export default function UserContentFeed({ initialContent, editable = false }: UserContentFeedProps) {
    const { user } = useUser();
    const { socket } = useSocket();
    const [content, setContent] = useState<ContentItem[]>(initialContent);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [editingItem, setEditingItem] = useState<Entry | undefined>(undefined);
    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [openWithComments, setOpenWithComments] = useState(false);

    const isCurrentUserAuthor = (item: ContentItem): boolean => {
        if (!user?.id) return false;
        if (isImage(item)) return item.userId === user.id;
        return item.author.id === user.id;
    };

    const handleDeleted = (id: string) => {
        setContent(prev => prev.filter(item => item.id !== id));
    };

    const handleEdit = (item: Entry) => {
        setEditingItem(item);
        setModalType('entry');
    };

    const handleFlag = (item: Entry) => {
        // TODO: Implement flag functionality
    };

    const handleCloseModal = () => {
        setModalType(null);
        setEditingItem(undefined);
    };

    const handleEntrySuccess = (entry: Entry) => {
        if (editingItem) {
            setContent(prev => prev.map(item => item.id === entry.id ? entry : item));
        } else {
            setContent(prev => [entry, ...prev]);
        }
        handleCloseModal();
    };

    useEffect(() => {
        const fetchCommentCounts = async () => {
            const itemIds = filterCommentableContent(initialContent).map(item => item.id);
            if (itemIds.length === 0) return;
            try {
                const counts = await getCommentCountsForItems(itemIds);
                setContent(prev => prev.map(item => ({
                    ...item,
                    commentCount: counts[item.id] || 0,
                })));
            } catch (error) {
                console.error('Failed to fetch comment counts:', error);
            }
        };
        fetchCommentCounts();
    }, []);

    const handleCloseLightbox = useCallback(() => {
        setSelectedImage(null);
        setOpenWithComments(false);
    }, []);

    const handleCommentImageClick = useCallback((image: Image) => {
        setOpenWithComments(true);
        setSelectedImage(image);
    }, []);

    const handleImageLikeChange = useCallback((newLiked: boolean, newCount: number) => {
        if (!selectedImage) return;
        setSelectedImage(prev => prev ? {
            ...prev,
            likedByCurrentUser: newLiked,
            likes: newLiked
                ? [...(prev.likes || []), user?.id || '']
                : (prev.likes || []).filter(id => id !== user?.id),
        } : null);
    }, [selectedImage, user?.id]);

    const handleImageDeleted = useCallback(() => {
        if (!selectedImage) return;
        setContent(prev => prev.filter(item => item.id !== selectedImage.id));
        handleCloseLightbox();
    }, [selectedImage, handleCloseLightbox]);

    useCommentCountSocket(socket, setContent);

    const filteredContent = filterCommentableContent(content);

    return (
        <div className='w-full max-w-[600px] pb-4'>
            {editable && (
                <div className='flex justify-end mb-4'>
                    <Button size='sm' onClick={() => setModalType('entry')}>+ New Entry</Button>
                </div>
            )}

            <div className='w-full max-w-[600px] mt-4 space-y-4'>
                {filteredContent.length === 0 ? (
                    <p className='text-gray-500'>No content to display</p>
                ) : (
                    filteredContent.map((item) =>
                        isCurrentUserAuthor(item) ? (
                            <ContentItemCard
                                key={`${item.contentType}-${item.id}`}
                                item={item}
                                editable={true}
                                onDeleted={handleDeleted}
                                onEdit={handleEdit}
                                onFlag={handleFlag}
                                onImageClick={setSelectedImage}
                                onCommentImageClick={handleCommentImageClick}
                            />
                        ) : (
                            <ContentItemCard
                                key={`${item.contentType}-${item.id}`}
                                item={item}
                                onImageClick={setSelectedImage}
                                onCommentImageClick={handleCommentImageClick}
                            />
                        )
                    )
                )}
            </div>

            {modalType === 'entry' && (
                <Modal isOpen={true} onClose={handleCloseModal}>
                    <div className='flex flex-row items-center justify-between mb-4'>
                        <h1 className='text-2xl font-semibold text-gray-900'>
                            {editingItem
                                ? `Edit ${editingItem.contentType}`
                                : 'New Entry'}
                        </h1>
                        <button
                            className='text-gray-500 hover:text-gray-700 text-2xl leading-none cursor-pointer'
                            onClick={handleCloseModal}
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
