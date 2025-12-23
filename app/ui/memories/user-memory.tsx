// app/ui/memories/user-memory.tsx

'use client';

import type { Memory } from '@/app/lib/definitions/memory';
import EditContentButton from '../edit-content-button';
import ContentCard from '../content-card';
import ContentImage from '../content-image';
import { useContentPermissions } from '@/app/lib/hooks/use-content-permissions';
import { useContentDelete } from '@/app/lib/hooks/use-content-delete';
import { useTheme } from '@/app/lib/hooks/use-theme';

interface UserMemoryProps {
  memory: Memory;
  onDeleted: (memoryId: string) => void;
  onEdit: (memory: Memory) => void;
  onFlag: (memory: Memory) => void;
}

export default function UserMemory({ memory, onDeleted, onEdit, onFlag }: UserMemoryProps) {
  const { canEdit, canDelete } = useContentPermissions(memory.author.id);
  const handleDelete = useContentDelete('memories', onDeleted);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

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
      actions={{
        onDelete: () => handleDelete(memory.id),
        onFlag: () => onFlag(memory),
        canDelete,
      }}
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
      <ContentImage image={memory.image} alt='Memory image' className='max-w-full max-h-96 rounded my-2 object-cover' />
      {memory.content && (
        <div className='flex flex-row gap-2'>
          <p className='flex-1 whitespace-pre-wrap' style={{ color: isDark ? '#ffffff' : '#111827' }}>{memory.content}</p>
          {canEdit && <EditContentButton onEdit={() => onEdit(memory)} />}
        </div>
      )}
    </ContentCard>
  );
}
