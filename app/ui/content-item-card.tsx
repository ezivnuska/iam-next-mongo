// app/ui/content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import type { Entry } from '@/app/lib/definitions/entry';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import ContentCard from '@/app/ui/content-card';
import ContentImage from '@/app/ui/content-image';
import MemoryPolaroid from '@/app/ui/memories/memory-polaroid';
import { isMemory, isPost } from '@/app/lib/utils/content-helpers';
import { useContentPermissions } from '@/app/lib/hooks/use-content-permissions';
import { useContentDelete } from '@/app/lib/hooks/use-content-delete';
import { useScreenOrientation } from '@iam/ui';
import { IMAGE_SIZES } from '@/app/lib/utils/images';

type ContentItemCardProps = {
  item: ContentItem;
  onImageClick?: (image: ImageType) => void;
  onCommentImageClick?: (image: ImageType, itemId: string, itemType: 'Memory' | 'Post') => void;
  autoExpandComments?: boolean;
  editable?: boolean;
  onEdit?: (item: Entry) => void;
  onDeleted?: (id: string) => void;
  onFlag?: (item: Entry) => void;
}

export default function ContentItemCard({
  item,
  onImageClick,
  onCommentImageClick,
  autoExpandComments,
  editable = false,
  onEdit,
  onDeleted,
  onFlag,
}: ContentItemCardProps) {
  const authorId = isMemory(item) || isPost(item) ? item.author.id : '';
  const { canEdit, canDelete } = useContentPermissions(authorId);
  const handleDelete = useContentDelete('entries', onDeleted || (() => {}));
  const orientation = useScreenOrientation();
  const isLandscape = orientation === 'landscape';

  if (isMemory(item)) {
    if (isLandscape) {
      const memoryDate = item.date
        ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      return (
        <ContentCard
          author={item.author}
          avatar={item.author.avatar}
          createdAt={item.createdAt}
          actions={editable && onFlag ? { onFlag: () => onFlag(item) } : undefined}
          href={`/users/${item.author.username}/${item.id}`}
          compact
          thumbnail={
            item.image
              ? <ContentImage
                  image={item.image}
                  size={IMAGE_SIZES.THUMBNAIL}
                  className='w-14 h-14 rounded object-cover'
                />
              : undefined
          }
        >
          <div className='flex flex-col min-w-0'>
            {item.title && <p className='text-sm font-semibold text-gray-900 truncate'>{item.title}</p>}
            {memoryDate && <p className='text-xs text-gray-500 truncate'>{memoryDate}</p>}
            {item.content && <p className='text-sm text-gray-700 truncate'>{item.content}</p>}
          </div>
        </ContentCard>
      );
    }

    return (
      <MemoryPolaroid
        entry={item}
        onImageClick={item.image && onImageClick ? () => onImageClick(item.image!) : undefined}
        actions={editable ? {
          onDelete: () => handleDelete(item.id),
          onFlag: onFlag ? () => onFlag(item) : undefined,
          canDelete,
        } : undefined}
        interactions={{
          initialLiked: item.likedByCurrentUser,
          initialLikeCount: item.likes?.length || 0,
          initialCommentCount: item.commentCount || 0,
          autoExpandComments,
          onCommentClick: item.image
            ? (onCommentImageClick
                ? () => onCommentImageClick(item.image!, item.id, 'Memory')
                : onImageClick ? () => onImageClick(item.image!) : undefined)
            : undefined,
        }}
        editable={editable}
        canEdit={canEdit}
        onEdit={onEdit ? () => onEdit(item) : undefined}
      />
    );
  }

  if (isPost(item)) {
    return (
      <ContentCard
        author={item.author}
        avatar={item.author.avatar}
        createdAt={item.createdAt}
        actions={editable && onFlag ? { onFlag: () => onFlag(item) } : undefined}
        href={`/users/${item.author.username}/${item.id}`}
        compact={isLandscape}
        thumbnail={
          isLandscape && item.image
            ? <ContentImage
                image={item.image}
                size={IMAGE_SIZES.THUMBNAIL}
                className='w-14 h-14 rounded object-cover'
              />
            : undefined
        }
      >
        {item.content && (
          isLandscape ? (
            <p className='text-sm text-gray-900 truncate'>{item.content}</p>
          ) : (
            <div className='flex flex-col gap-1 py-1 text-gray-900'>
              <p>{item.content}</p>
              {item.linkUrl && (
                <a href={item.linkUrl} target='_blank' className='text-blue-500 underline' onClick={e => e.stopPropagation()}>
                  [source]
                </a>
              )}
            </div>
          )
        )}
        {!isLandscape && (
          <ContentImage
            image={item.image}
            alt='Post image'
            className='rounded mt-2 object-cover'
          />
        )}
      </ContentCard>
    );
  }

  return null;
}
