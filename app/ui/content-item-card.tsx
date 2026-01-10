// app/ui/content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import type { Memory } from '@/app/lib/definitions/memory';
import type { Post } from '@/app/lib/definitions/post';
import ContentCard from '@/app/ui/content-card';
import ContentImage from '@/app/ui/content-image';
import EditContentButton from '@/app/ui/edit-content-button';
import MemoryPolaroid from '@/app/ui/memories/memory-polaroid';
import { useIsDark } from '@/app/lib/hooks/use-is-dark';
import { getTextColor, getMutedTextColor } from '@/app/lib/utils/theme-colors';
import { isMemory, isPost } from '@/app/lib/utils/content-helpers';
import { useContentPermissions } from '@/app/lib/hooks/use-content-permissions';
import { useContentDelete } from '@/app/lib/hooks/use-content-delete';

type ContentItemCardProps = {
  item: ContentItem;
  onImageClick?: (image: ImageType) => void;
  autoExpandComments?: boolean;
  // Edit/Delete capabilities
  editable?: boolean;
  onEdit?: (item: Memory | Post) => void;
  onDeleted?: (id: string) => void;
  onFlag?: (item: Memory | Post) => void;
}

export default function ContentItemCard({
  item,
  onImageClick,
  autoExpandComments,
  editable = false,
  onEdit,
  onDeleted,
  onFlag,
}: ContentItemCardProps) {
  const isDark = useIsDark();

  // Get author ID and check permissions (hooks must be called unconditionally)
  const authorId = isMemory(item) || isPost(item) ? item.author.id : '';
  const { canEdit, canDelete } = useContentPermissions(authorId);

  // Set up delete handler based on content type (provide no-op if onDeleted not provided)
  const contentType = isMemory(item) ? 'memories' : isPost(item) ? 'posts' : null;
  const handleDelete = useContentDelete(
    contentType as 'memories' | 'posts',
    onDeleted || (() => {})
  );

  let content: React.ReactNode;

  if (isMemory(item)) {
    const memory = item;

    content = (
      <MemoryPolaroid
        memory={memory}
        onImageClick={memory.image && onImageClick ? () => onImageClick(memory.image!) : undefined}
        actions={editable ? {
          onDelete: () => handleDelete(memory.id),
          onFlag: onFlag ? () => onFlag(memory) : undefined,
          canDelete,
        } : undefined}
        interactions={{
          initialLiked: memory.likedByCurrentUser,
          initialLikeCount: memory.likes?.length || 0,
          initialCommentCount: memory.commentCount || 0,
          autoExpandComments,
        }}
        editable={editable}
        canEdit={canEdit}
        onEdit={onEdit ? () => onEdit(memory) : undefined}
      />
    );
  }

  else if (isPost(item)) {
    const post = item;

    content = (
      <ContentCard
        author={post.author}
        avatar={post.author.avatar}
        createdAt={post.createdAt}
        itemId={post.id}
        itemType='Post'
        actions={editable ? {
          onDelete: () => handleDelete(post.id),
          onFlag: onFlag ? () => onFlag(post) : undefined,
          canDelete,
        } : undefined}
        interactions={{
          initialLiked: post.likedByCurrentUser,
          initialLikeCount: post.likes?.length || 0,
          initialCommentCount: post.commentCount || 0,
          autoExpandComments,
        }}
      >
        <ContentImage
          image={post.image}
          alt='Post image'
          className='rounded mt-2 object-cover'
          onClick={post.image && onImageClick ? () => onImageClick(post.image!) : undefined}
        />
        {post.content && (
          <div className='flex flex-row gap-2'>
            <div className='flex flex-1 py-1'>
              <div className='flex flex-col gap-1' style={{ color: getTextColor(isDark) }}>
                <p>{post.content}</p>
                {post.linkUrl && (
                  <a href={post.linkUrl} target='_blank' className='text-blue-500 underline'>
                    [source]
                  </a>
                )}
              </div>
            </div>
            {editable && canEdit && onEdit && <EditContentButton onEdit={() => onEdit(post)} />}
          </div>
        )}
      </ContentCard>
    );
  }
  else {
    // Only posts and memories are shown in feed
    return null;
  }

  return content;
}
