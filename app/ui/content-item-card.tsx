// app/ui/content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import ContentCard from '@/app/ui/content-card';
import ContentImage from '@/app/ui/content-image';
import MemoryContent from '@/app/ui/memories/memory-content';
import { isMemory, isPost } from '@/app/lib/utils/content-helpers';
import { IMAGE_SIZES } from '@/app/lib/utils/images';
import { useHorizontalLayout } from '@iam/ui';

type ContentItemCardProps = {
  item: ContentItem;
  onImageClick?: (image: ImageType) => void;
  editable?: boolean;
  onFlag?: (item: ContentItem) => void;
}

export default function ContentItemCard({
  item,
  onImageClick,
  editable = false,
  onFlag,
}: ContentItemCardProps) {
  const isCompact = useHorizontalLayout() ?? false;

  if (isMemory(item)) {
    return (
      <ContentCard
        author={item.author}
        avatar={item.author.avatar}
        createdAt={item.createdAt}
        actions={editable && onFlag ? { onFlag: () => onFlag(item) } : undefined}
        href={`/users/${item.author.username}/${item.id}`}
        compact={isCompact}
        thumbnail={
          isCompact && item.image
            ? <ContentImage
                image={item.image}
                size={IMAGE_SIZES.THUMBNAIL}
                className='w-[84px] h-[84px] rounded object-cover'
              />
            : undefined
        }
      >
        <MemoryContent
          date={item.date}
          title={item.title}
          content={item.content}
          image={item.image}
          variant={isCompact ? 'compact' : 'list'}
        />
      </ContentCard>
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
        compact={isCompact}
        thumbnail={
          isCompact && item.image
            ? <ContentImage
                image={item.image}
                size={IMAGE_SIZES.THUMBNAIL}
                className='w-[84px] h-[84px] rounded object-cover'
              />
            : undefined
        }
      >
        {item.content && (
          isCompact ? (
            <p className='text-sm text-gray-900 truncate'>{item.content}</p>
          ) : (
            <div className='flex flex-col gap-1 py-1 text-gray-900'>
              <p>{item.content}</p>
              {item.linkUrl && (
                <a href={item.linkUrl} target='_blank' rel='noopener noreferrer' className='text-blue-500 underline' onClick={e => e.stopPropagation()}>
                  [source]
                </a>
              )}
            </div>
          )
        )}
        {!isCompact && (
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
