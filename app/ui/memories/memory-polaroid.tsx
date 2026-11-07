// app/ui/memories/memory-polaroid.tsx

'use client';

import type { Entry } from '@/app/lib/definitions/entry';
import ContentImage from '@/app/ui/content-image';
import ContentInteractions from '@/app/ui/content-interactions';
import UnifiedUserHeader from '@/app/ui/user/unified-user-header';
import EditContentButton from '@/app/ui/edit-content-button';

interface MemoryPolaroidProps {
  entry: Entry;
  onImageClick?: () => void;
  className?: string;
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
    onCommentClick?: () => void;
  };
  editable?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
}

export default function MemoryPolaroid({
  entry,
  onImageClick,
  className = '',
  actions,
  interactions,
  editable = false,
  canEdit = false,
  onEdit,
}: MemoryPolaroidProps) {
  const memoryDate = entry.date
    ? new Date(entry.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className='flex flex-col w-full'>
      <UnifiedUserHeader
        user={entry.author}
        avatar={entry.author.avatar}
        onFlag={actions?.onFlag}
        onDelete={actions?.onDelete}
        canDelete={actions?.canDelete}
        avatarSize={36}
        clickable
      />

      <div
        className={`
          bg-white
          p-3 pb-6
          shadow-lg
          hover:shadow-xl
          transition-all
          duration-200
          mt-2
          ${className}
        `}
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        <div className="bg-gray-200 aspect-square mb-3 overflow-hidden">
          {entry.image ? (
            <ContentImage
              image={entry.image}
              alt={entry.title || 'Memory image'}
              className="w-full h-full object-cover cursor-pointer"
              onClick={onImageClick}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No photo
            </div>
          )}
        </div>

        <div className="text-center space-y-1 px-2">
          {entry.title && (
            <p className="text-sm font-semibold text-gray-900">{entry.title}</p>
          )}
          <p className="text-xs text-gray-700">{memoryDate}</p>
        </div>
      </div>

      {entry.content && (
        <div className='flex flex-row gap-2 mt-2'>
          <p className='flex-1 whitespace-pre-wrap text-sm text-gray-800'>{entry.content}</p>
          {editable && canEdit && onEdit && <EditContentButton onEdit={onEdit} />}
        </div>
      )}

      {interactions && (
        <div className='mt-2'>
          <ContentInteractions
            itemId={entry.id}
            itemType='Memory'
            initialLiked={interactions.initialLiked}
            initialLikeCount={interactions.initialLikeCount || 0}
            initialCommentCount={interactions.initialCommentCount || 0}
            autoExpandComments={interactions.autoExpandComments}
            onCommentClick={interactions.onCommentClick}
          />
        </div>
      )}
    </div>
  );
}
