// app/ui/posts/user-post.tsx

'use client';

import type { Post } from '@/app/lib/definitions/post';
import EditContentButton from '../edit-content-button';
import ContentCard from '../content-card';
import ContentImage from '../content-image';
import { useContentPermissions } from '@/app/lib/hooks/use-content-permissions';
import { useContentDelete } from '@/app/lib/hooks/use-content-delete';
import { useTheme } from '@/app/lib/hooks/use-theme';

interface UserPostProps {
    post: Post;
    onDeleted: (postId: string) => void;
    onEdit: (post: Post) => void;
    onFlag: (post: Post) => void;
}

export default function UserPost({ post, onDeleted, onEdit, onFlag }: UserPostProps) {
    const { canEdit, canDelete } = useContentPermissions(post.author.id);
    const handleDelete = useContentDelete('posts', onDeleted);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <ContentCard
            author={post.author}
            avatar={post.author.avatar}
            createdAt={post.createdAt}
            itemId={post.id}
            itemType='Post'
            actions={{
                onDelete: () => handleDelete(post.id),
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
            <ContentImage image={post.image} alt='Post image' className='rounded mt-2 object-cover' />
            {post.content && (
                <div className='flex flex-row gap-2'>
                    <div className='flex flex-1 py-1'>
                        <div className='flex flex-col gap-1'>
                            <p style={{ color: isDark ? '#ffffff' : '#111827' }}>{post.content}</p>
                            {post.linkUrl && (
                                <a href={post.linkUrl} target='_blank' className='text-blue-500 underline'>
                                    [source]
                                </a>
                            )}
                        </div>
                    </div>
                    {canEdit && <EditContentButton onEdit={() => onEdit(post)} />}
                </div>
            )}
        </ContentCard>
    );
}
