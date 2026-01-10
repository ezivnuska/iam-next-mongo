// app/ui/memories/memory-polaroid.tsx

'use client';

import type { Memory } from '@/app/lib/definitions/memory';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import ContentImage from '@/app/ui/content-image';
import ContentInteractions from '@/app/ui/content-interactions';
import UnifiedUserHeader from '@/app/ui/user/unified-user-header';
import EditContentButton from '@/app/ui/edit-content-button';

interface MemoryPolaroidProps {
  memory: Memory;
  onImageClick?: () => void;
  className?: string;
  // Content card functionality
  actions?: {
    onDelete?: () => Promise<void>;
    onFlag?: () => void;
    canDelete?: boolean;
  };
  interactions?: {
    initialLiked?: boolean;
    initialLikeCount?: number;
    initialCommentCount?: number;
    autoExpandComments?: boolean;
  };
  editable?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
}

export default function MemoryPolaroid({
  memory,
  onImageClick,
  className = '',
  actions,
  interactions,
  editable = false,
  canEdit = false,
  onEdit,
}: MemoryPolaroidProps) {
  const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className='flex flex-col w-full'>
      {/* User header */}
      <UnifiedUserHeader
        user={memory.author}
        avatar={memory.author.avatar}
        onFlag={actions?.onFlag}
        onDelete={actions?.onDelete}
        canDelete={actions?.canDelete}
        avatarSize={36}
        clickable
      />

      {/* Polaroid container */}
      <div
        className={`
          bg-white dark:bg-gray-100
          p-3 pb-6
          shadow-lg
          hover:shadow-xl
          transition-all
          duration-200
          mt-2
          ${className}
        `}
        style={{
          transform: 'rotate(-0.5deg)',
          maxWidth: '100%',
        }}
      >
        {/* Image container */}
        <div className="bg-gray-200 dark:bg-gray-300 aspect-square mb-3 overflow-hidden">
          {memory.image ? (
            <ContentImage
              image={memory.image}
              alt={memory.title || 'Memory image'}
              className="w-full h-full object-cover cursor-pointer"
              onClick={onImageClick}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No photo
            </div>
          )}
        </div>

        {/* Caption area - polaroid style */}
        <div className="text-center space-y-1 px-2">
          {memory.title && (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-800">
              {memory.title}
            </p>
          )}
          <p className="text-xs text-gray-700 dark:text-gray-600">
            {memoryDate}
          </p>
        </div>
      </div>

      {/* Content text with edit button */}
      {memory.content && (
        <div className='flex flex-row gap-2 mt-2'>
          <p className='flex-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200'>
            {memory.content}
          </p>
          {editable && canEdit && onEdit && <EditContentButton onEdit={onEdit} />}
        </div>
      )}

      {/* Footer Interactions */}
      {interactions && (
        <div className='mt-2'>
          <ContentInteractions
            itemId={memory.id}
            itemType='Memory'
            initialLiked={interactions.initialLiked}
            initialLikeCount={interactions.initialLikeCount || 0}
            initialCommentCount={interactions.initialCommentCount || 0}
            autoExpandComments={interactions.autoExpandComments}
          />
        </div>
      )}
    </div>
  );
}
