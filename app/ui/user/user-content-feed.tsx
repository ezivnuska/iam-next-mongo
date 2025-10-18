// app/ui/user/user-content-feed.tsx

"use client";

import { useState } from "react";
import type { ContentItem } from "@/app/lib/definitions/content";
import type { Memory } from "@/app/lib/definitions/memory";
import type { Post } from "@/app/lib/definitions/post";
import type { Image } from "@/app/lib/definitions/image";
import { Button } from "@/app/ui/button";
import ContentItemCard from "@/app/ui/content-item-card";
import UserContentItemCard from "@/app/ui/user-content-item-card";
import Modal from "@/app/ui/modal";
import CreateMemoryForm from "@/app/ui/memories/create-memory-form";
import CreatePostForm from "@/app/ui/posts/create-post-form";
import UploadForm from "@/app/ui/images/upload-form";

interface UserContentFeedProps {
    initialContent: ContentItem[];
    editable?: boolean;
}

type FilterType = 'all' | 'memory' | 'post' | 'image';
type ModalType = 'memory' | 'post' | 'image' | null;

export default function UserContentFeed({ initialContent, editable = false }: UserContentFeedProps) {
    const [content, setContent] = useState<ContentItem[]>(initialContent);
    const [filter, setFilter] = useState<FilterType>('all');
    const [modalType, setModalType] = useState<ModalType>(null);
    const [editingItem, setEditingItem] = useState<Memory | Post | undefined>(undefined);

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
        console.log('Flag item:', item);
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

    const filteredContent = filter === 'all'
        ? content
        : content.filter(item => item.contentType === filter);

    return (
        <div className="mt-4">
            {/* Add Buttons - only show when editable */}
            {editable && (
                <div className="flex justify-between gap-2 mb-4">
                    <Button onClick={() => setModalType('memory')}>
                        + Memory
                    </Button>
                    <Button onClick={() => setModalType('post')}>
                        + Post
                    </Button>
                    <Button onClick={() => setModalType('image')}>
                        + Image
                    </Button>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex justify-between gap-2 mb-4">
                <Button
                    variant={filter === 'all' ? 'active' : 'ghost'}
                    onClick={() => setFilter('all')}
                >
                    All
                    {/* ({content.length}) */}
                </Button>
                <Button
                    variant={filter === 'memory' ? 'active' : 'ghost'}
                    onClick={() => setFilter('memory')}
                >
                    Memories
                    {/* ({content.filter(i => i.contentType === 'memory').length}) */}
                </Button>
                <Button
                    variant={filter === 'post' ? 'active' : 'ghost'}
                    onClick={() => setFilter('post')}
                >
                    Posts
                    {/* ({content.filter(i => i.contentType === 'post').length}) */}
                </Button>
                <Button
                    variant={filter === 'image' ? 'active' : 'ghost'}
                    onClick={() => setFilter('image')}
                >
                    Images
                    {/* ({content.filter(i => i.contentType === 'image').length}) */}
                </Button>
            </div>

            {/* Content List */}
            <div className="space-y-4">
                {filteredContent.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No content to display</p>
                ) : (
                    filteredContent.map((item) => (
                        editable ? (
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
                        <h1 className="text-2xl font-semibold">
                            {editingItem ? 'Edit Memory' : 'Create Memory'}
                        </h1>
                        <button
                            className="text-gray-500 hover:text-gray-700 text-2xl leading-none cursor-pointer"
                            onClick={handleCloseModal}
                            aria-label="Close"
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
                        <h1 className="text-2xl font-semibold">
                            {editingItem ? 'Edit Post' : 'Create Post'}
                        </h1>
                        <button
                            className="text-gray-500 hover:text-gray-700 text-2xl leading-none cursor-pointer"
                            onClick={handleCloseModal}
                            aria-label="Close"
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

            {/* Image Upload Modal */}
            {modalType === 'image' && (
                <Modal isOpen={true} onClose={handleCloseModal}>
                    <div className='flex flex-row items-center justify-between mb-4'>
                        <h1 className="text-2xl font-semibold">
                            Upload Image
                        </h1>
                        <button
                            className="text-gray-500 hover:text-gray-700 text-2xl leading-none cursor-pointer"
                            onClick={handleCloseModal}
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                    <UploadForm
                        onUploadSuccess={handleImageSuccess}
                        onClose={handleCloseModal}
                    />
                </Modal>
            )}
        </div>
    );
}
