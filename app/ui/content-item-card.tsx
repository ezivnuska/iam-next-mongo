// app/ui/content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import type { Entry } from '@/app/lib/definitions/entry';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import ContentCard from '@/app/ui/content-card';
import ContentImage from '@/app/ui/content-image';
import EditContentButton from '@/app/ui/edit-content-button';
import MemoryPolaroid from '@/app/ui/memories/memory-polaroid';
import { isMemory, isPost } from '@/app/lib/utils/content-helpers';
import { useContentPermissions } from '@/app/lib/hooks/use-content-permissions';
import { useContentDelete } from '@/app/lib/hooks/use-content-delete';

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

  if (isMemory(item)) {
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
        itemId={item.id}
        itemType='Post'
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
                ? () => onCommentImageClick(item.image!, item.id, 'Post')
                : onImageClick ? () => onImageClick(item.image!) : undefined)
            : undefined,
        }}
      >
        <ContentImage
          image={item.image}
          alt='Post image'
          className='rounded mt-2 object-cover'
          onClick={item.image && onImageClick ? () => onImageClick(item.image!) : undefined}
        />
        {item.content && (
          <div className='flex flex-row gap-2'>
            <div className='flex flex-1 py-1'>
              <div className='flex flex-col gap-1 text-gray-900'>
                <p>{item.content}</p>
                {item.linkUrl && (
                  <a href={item.linkUrl} target='_blank' className='text-blue-500 underline'>
                    [source]
                  </a>
                )}
              </div>
            </div>
            {editable && canEdit && onEdit && <EditContentButton onEdit={() => onEdit(item)} />}
          </div>
        )}
      </ContentCard>
    );
  }

  return null;
}
