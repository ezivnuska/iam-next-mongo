// app/ui/posts/user-post.tsx

'use client';

import { useUser } from '@/app/lib/providers/user-provider';
import type { Post } from '@/app/lib/definitions/post';
import EditContentButton from '../edit-content-button';
import ContentCard from '../content-card';
import { getBestVariant, IMAGE_SIZES } from '@/app/lib/utils/images';

interface UserPostProps {
    post: Post;
    onDeleted: (postId: string) => void;
    onEdit: (post: Post) => void;
    onFlag: (post: Post) => void;
}

export default function UserPost({ post, onDeleted, onEdit, onFlag }: UserPostProps) {
    const { user } = useUser();
    const imageVariant = getBestVariant(post.image, IMAGE_SIZES.CONTENT);
    const isAuthor = user?.id === post.author.id;
    const isAdmin = user?.role === 'admin';
    const canEdit = isAuthor;
    const canDelete = isAuthor || isAdmin;

    const handleDelete = async () => {
        const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete post');
        onDeleted(post.id);
    };

    return (
        <ContentCard
            author={post.author}
            avatar={post.author.avatar}
            createdAt={post.createdAt}
            itemId={post.id}
            itemType='Post'
            actions={{
                onDelete: handleDelete,
                onFlag: () => onFlag(post),
                canEdit,
                canDelete,
            }}
            interactions={{
                initialLiked: post.likedByCurrentUser,
                initialLikeCount: post.likes?.length || 0,
                initialCommentCount: post.commentCount || 0,
            }}
        >
            {imageVariant && (
                <img
                    src={imageVariant.url}
                    alt='Post image'
                    className='rounded mt-2 object-cover'
                />
            )}
            {post.content && (
                <div className='flex flex-row gap-2'>
                    <div className='flex flex-1 text-white py-1 gap-2'>
                        {post.content && <p>{post.content}</p>}
                        {post.linkUrl && (
                            <a href={post.linkUrl} target='_blank' className='text-blue-500 underline mt-2 block'>
                                [source]
                            </a>
                        )}
                    </div>
                    {canEdit && <EditContentButton onEdit={() => onEdit(post)} />}
                </div>
            )}
        </ContentCard>
    );
}
