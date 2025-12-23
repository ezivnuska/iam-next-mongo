// app/ui/content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import ContentCard from '@/app/ui/content-card';
import { getBestVariant, IMAGE_SIZES } from '@/app/lib/utils/images';

type ContentItemCardProps = {
  item: ContentItem;
}

export default function ContentItemCard({ item }: ContentItemCardProps) {
  if (item.contentType === 'memory') {
    const memory = item;
    const imageVariant = getBestVariant(memory.image, IMAGE_SIZES.CONTENT);
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
          <p className='text-lg font-bold text-white'>{memoryDate}</p>
          {memory.title && <p className='text-lg font-light text-gray-400'>{memory.title}</p>}
        </div>
        {imageVariant && (
          <img
            src={imageVariant.url}
            alt='Memory image'
            className='max-w-full max-h-96 rounded my-2 object-cover'
          />
        )}
        {memory.content && (
          <p className='text-white whitespace-pre-wrap'>{memory.content}</p>
        )}
      </ContentCard>
    );
  }

  if (item.contentType === 'post') {
    const post = item;
    const imageVariant = getBestVariant(post.image, IMAGE_SIZES.CONTENT);

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
        {imageVariant && (
          <img
            src={imageVariant.url}
            alt='Post image'
            className='rounded mt-2 object-cover'
          />
        )}
        {post.content && (
          <div className='text-white py-1'>
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
    const imageVariant = getBestVariant(image, IMAGE_SIZES.CONTENT);

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
        {imageVariant && (
          <img
            src={imageVariant.url}
            alt={image.alt || 'Image'}
            className='rounded my-2 object-cover'
          />
        )}
      </ContentCard>
    );
  }

  return null;
}
