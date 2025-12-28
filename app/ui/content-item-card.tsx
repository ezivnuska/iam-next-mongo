// app/ui/content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import ContentCard from '@/app/ui/content-card';
import ContentImage from '@/app/ui/content-image';
import { useTheme } from '@/app/lib/hooks/use-theme';

type ContentItemCardProps = {
  item: ContentItem;
  onImageClick?: (image: ImageType) => void;
}

export default function ContentItemCard({ item, onImageClick }: ContentItemCardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  if (item.contentType === 'memory') {
    const memory = item;
    const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <ContentCard
        author={memory.author}
        avatar={memory.author.avatar}
        createdAt={memory.createdAt}
        itemId={memory.id}
        itemType='Memory'
        interactions={{
          initialLiked: memory.likedByCurrentUser,
          initialLikeCount: memory.likes?.length || 0,
          initialCommentCount: memory.commentCount || 0,
        }}
      >
        <div>
          <p className='text-lg font-bold' style={{ color: isDark ? '#ffffff' : '#111827' }}>{memoryDate}</p>
          {memory.title && <p className='text-lg font-light' style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>{memory.title}</p>}
        </div>
        <ContentImage
          image={memory.image}
          alt='Memory image'
          className='max-w-full max-h-96 rounded my-2 object-cover'
          onClick={memory.image && onImageClick ? () => onImageClick(memory.image!) : undefined}
        />
        {memory.content && (
          <p className='whitespace-pre-wrap' style={{ color: isDark ? '#ffffff' : '#111827' }}>{memory.content}</p>
        )}
      </ContentCard>
    );
  }

  if (item.contentType === 'post') {
    const post = item;

    return (
      <ContentCard
        author={post.author}
        avatar={post.author.avatar}
        createdAt={post.createdAt}
        itemId={post.id}
        itemType='Post'
        interactions={{
          initialLiked: post.likedByCurrentUser,
          initialLikeCount: post.likes?.length || 0,
          initialCommentCount: post.commentCount || 0,
        }}
      >
        <ContentImage
          image={post.image}
          alt='Post image'
          className='rounded mt-2 object-cover'
          onClick={post.image && onImageClick ? () => onImageClick(post.image!) : undefined}
        />
        {post.content && (
          <div className='py-1' style={{ color: isDark ? '#ffffff' : '#111827' }}>
            <p>{post.content}</p>
            {post.linkUrl && (
              <a href={post.linkUrl} target='_blank' className='text-blue-500 underline mt-2 block'>
                [source]
              </a>
            )}
          </div>
        )}
      </ContentCard>
    );
  }

  if (item.contentType === 'image') {
    const image = item;

    return (
      <ContentCard
        author={{ id: image.userId || '', username: image.username }}
        avatar={undefined}
        createdAt={image.createdAt || new Date().toISOString()}
        itemId={image.id}
        itemType='Image'
        interactions={{
          initialLiked: image.likedByCurrentUser,
          initialLikeCount: image.likes?.length || 0,
          initialCommentCount: image.commentCount || 0,
        }}
      >
        <ContentImage
          image={image}
          alt={image.alt || 'Image'}
          className='rounded my-2 object-cover'
          onClick={onImageClick ? () => onImageClick(image) : undefined}
        />
      </ContentCard>
    );
  }

  return null;
}
