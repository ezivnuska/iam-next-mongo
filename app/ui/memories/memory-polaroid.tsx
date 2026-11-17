// app/ui/memories/memory-polaroid.tsx

'use client';

import type { Entry } from '@/app/lib/definitions/entry';
import ContentImage from '@/app/ui/content-image';
import ContentInteractions from '@/app/ui/content-interactions';
import EntryHeader from '@/app/ui/user/entry-header';
import FlagContentButton from '@/app/ui/flag-content-button';
import DeleteButtonWithConfirm from '@/app/ui/delete-button-with-confirm';
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
      <div className='flex items-center justify-between'>
        <EntryHeader
          username={entry.author.username}
          avatar={entry.author.avatar}
          avatarSize={40}
          createdAt={entry.createdAt}
        />
        {(actions?.onFlag || (actions?.canDelete && actions?.onDelete)) && (
          <div className='flex items-center gap-2 shrink-0'>
            {actions?.onFlag && <FlagContentButton onFlag={actions.onFlag} />}
            {actions?.canDelete && actions?.onDelete && <DeleteButtonWithConfirm onDelete={actions.onDelete} />}
          </div>
        )}
      </div>

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
