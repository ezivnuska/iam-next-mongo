// app/ui/user/user-content-feed.tsx

'use client';

import { useState } from 'react';
import type { ContentItem } from '@/app/lib/definitions/content';
import type { Memory } from '@/app/lib/definitions/memory';
import type { Post } from '@/app/lib/definitions/post';
import type { Image } from '@/app/lib/definitions/image';
import { Button } from '@/app/ui/button';
import ContentItemCard from '@/app/ui/content-item-card';
import UserContentItemCard from '@/app/ui/user-content-item-card';
import ContentFilterTabs from '@/app/ui/content-filter-tabs';
import Modal from '@/app/ui/modal';
import CreateMemoryForm from '@/app/ui/memories/create-memory-form';
import CreatePostForm from '@/app/ui/posts/create-post-form';
import UploadForm from '@/app/ui/images/upload-form';
import { useUser } from '@/app/lib/providers/user-provider';
import { useTheme } from '@/app/lib/hooks/use-theme';

interface UserContentFeedProps {
    initialContent: ContentItem[];
    editable?: boolean;
}

type ModalType = 'memory' | 'post' | 'image' | null;

export default function UserContentFeed({ initialContent, editable = false }: UserContentFeedProps) {
    const { user } = useUser();
    const { resolvedTheme } = useTheme();
    const [content, setContent] = useState<ContentItem[]>(initialContent);
    const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
    const [modalType, setModalType] = useState<ModalType>(null);
    const [editingItem, setEditingItem] = useState<Memory | Post | undefined>(undefined);

    // Check if current user is the author of an item
    const isCurrentUserAuthor = (item: ContentItem): boolean => {
        if (!user?.id) return false;

        if (item.contentType === 'image') {
            return item.userId === user.id;
        }
        return item.author.id === user.id;
    };

    const handleDeleted = (id: string) => {
        setContent(prev => prev.filter(item => item.id !== id));
    };

    const handleEdit = (item: ContentItem) => {
        if (item.contentType === 'image') return; // Images don't support editing yet
        setEditingItem(item);
        setModalType(item.contentType);
    };

    const handleFlag = (item: Memory | Post) => {
        // TODO: Implement flag functionality
    };

    const handleCloseModal = () => {
        setModalType(null);
        setEditingItem(undefined);
    };

    const handleMemorySuccess = (memory: Memory) => {
        if (editingItem) {
            setContent((prev) => prev.map(item => item.id === memory.id ? { ...memory, contentType: 'memory' as const } : item));
        } else {
            setContent((prev) => [{ ...memory, contentType: 'memory' as const }, ...prev]);
        }
        handleCloseModal();
    };

    const handlePostSuccess = (post: Post) => {
        if (editingItem) {
            setContent((prev) => prev.map(item => item.id === post.id ? { ...post, contentType: 'post' as const } : item));
        } else {
            setContent((prev) => [{ ...post, contentType: 'post' as const }, ...prev]);
        }
        handleCloseModal();
    };

    const handleImageSuccess = (image: Image) => {
        setContent((prev) => [{ ...image, contentType: 'image' as const }, ...prev]);
        handleCloseModal();
    };

    // If no filters are selected, show all content
    // Otherwise, show only content that matches the selected filters
    const filteredContent = selectedFilters.size === 0
        ? content
        : content.filter(item => selectedFilters.has(item.contentType));

    return (
        <div className='w-full max-w-[600px] pb-4'>
            {/* Add Buttons - only show when editable */}
            {editable && (
                <div className='flex justify-between gap-2 mb-4'>
                    <Button
                        size='sm'
                        onClick={() => setModalType('memory')}
                    >
                        + Memory
                    </Button>
                    <Button
                        size='sm'
                        onClick={() => setModalType('post')}
                    >
                        + Post
                    </Button>
                </div>
            )}

            {/* Filter Tabs */}
            <ContentFilterTabs
                selectedFilters={selectedFilters}
                onFilterChange={setSelectedFilters}
            />

            {/* Content List */}
            <div className='w-full max-w-[600px] mt-4 space-y-4'>
                {filteredContent.length === 0 ? (
                    <p className='text-gray-500 dark:text-gray-400'>No content to display</p>
                ) : (
                    filteredContent.map((item) => (
                        isCurrentUserAuthor(item) ? (
                            <UserContentItemCard
                                key={`${item.contentType}-${item.id}`}
                                item={item}
                                onDeleted={handleDeleted}
                                onEdit={handleEdit}
                                onFlag={handleFlag}
                            />
                        ) : (
                            <ContentItemCard key={`${item.contentType}-${item.id}`} item={item} />
                        )
                    ))
                )}
            </div>

            {/* Memory Modal */}
            {modalType === 'memory' && (
                <Modal isOpen={true} onClose={handleCloseModal}>
                    <div className='flex flex-row items-center justify-between mb-4'>
                        <h1 className='text-2xl font-semibold' style={{ color: resolvedTheme === 'dark' ? '#ffffff' : '#111827' }}>
                            {editingItem ? 'Edit Memory' : 'Create Memory'}
                        </h1>
                        <button
                            className='text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none cursor-pointer'
                            onClick={handleCloseModal}
                            aria-label='Close'
                        >
                            ✕
                        </button>
                    </div>
                    <CreateMemoryForm
                        onSuccess={handleMemorySuccess}
                        onClose={handleCloseModal}
                        editItem={editingItem as Memory | undefined}
                    />
                </Modal>
            )}

            {/* Post Modal */}
            {modalType === 'post' && (
                <Modal isOpen={true} onClose={handleCloseModal}>
                    <div className='flex flex-row items-center justify-between mb-4'>
                        <h1 className='text-2xl font-semibold' style={{ color: resolvedTheme === 'dark' ? '#ffffff' : '#111827' }}>
                            {editingItem ? 'Edit Post' : 'Create Post'}
                        </h1>
                        <button
                            className='text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none cursor-pointer'
                            onClick={handleCloseModal}
                            aria-label='Close'
                        >
                            ✕
                        </button>
                    </div>
                    <CreatePostForm
                        onSuccess={handlePostSuccess}
                        onClose={handleCloseModal}
                        editItem={editingItem as Post | undefined}
                    />
                </Modal>
            )}
        </div>
    );
}
