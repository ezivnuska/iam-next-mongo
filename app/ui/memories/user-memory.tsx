// app/ui/memories/user-memory.tsx

'use client';

import { useUser } from '@/app/lib/providers/user-provider';
import type { Memory } from '@/app/lib/definitions/memory';
import EditContentButton from '../edit-content-button';
import ContentCard from '../content-card';
import { getBestVariant, IMAGE_SIZES } from '@/app/lib/utils/images';

interface UserMemoryProps {
  memory: Memory;
  onDeleted: (memoryId: string) => void;
  onEdit: (memory: Memory) => void;
  onFlag: (memory: Memory) => void;
}

export default function UserMemory({ memory, onDeleted, onEdit, onFlag }: UserMemoryProps) {
  const { user } = useUser();
  const imageVariant = getBestVariant(memory.image, IMAGE_SIZES.CONTENT);
  const isAuthor = user?.id === memory.author.id;
  const isAdmin = user?.role === 'admin';
  const canDelete = isAuthor || isAdmin;
  const canEdit = isAuthor;

  const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleDelete = async () => {
    const res = await fetch(`/api/memories/${memory.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete memory');
    onDeleted(memory.id);
  };

  return (
    <ContentCard
      author={memory.author}
      avatar={memory.author.avatar}
      createdAt={memory.createdAt}
      itemId={memory.id}
      itemType='Memory'
      actions={{
        onDelete: handleDelete,
        onFlag: () => onFlag(memory),
        canEdit,
        canDelete,
      }}
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
        <div className='flex flex-row text-white gap-2'>
          <p className='flex-1 whitespace-pre-wrap'>{memory.content}</p>
          {canEdit && <EditContentButton onEdit={() => onEdit(memory)} />}
        </div>
      )}
    </ContentCard>
  );
}
