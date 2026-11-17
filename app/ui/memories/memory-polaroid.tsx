// app/ui/memories/memory-polaroid.tsx

'use client';

import { useRouter } from 'next/navigation';
import type { Entry } from '@/app/lib/definitions/entry';
import ContentImage from '@/app/ui/content-image';
import EntryHeader from '@/app/ui/user/entry-header';
import FlagContentButton from '@/app/ui/flag-content-button';

interface MemoryPolaroidProps {
  entry: Entry;
  href?: string;
  onImageClick?: () => void;
  className?: string;
  actions?: {
    onFlag?: () => void;
  };
}

export default function MemoryPolaroid({
  entry,
  href,
  onImageClick,
  className = '',
  actions,
}: MemoryPolaroidProps) {
  const router = useRouter();
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
        {actions?.onFlag && (
          <div className='flex items-center shrink-0' onClick={e => e.stopPropagation()}>
            <FlagContentButton onFlag={actions.onFlag} />
          </div>
        )}
      </div>

      <div
        className={`bg-white p-3 pb-6 shadow-lg hover:shadow-xl transition-all duration-200 mt-2${href ? ' cursor-pointer' : ''} ${className}`}
        style={{ transform: 'rotate(-0.5deg)' }}
        onClick={href ? () => router.push(href) : undefined}
      >
        <div className="bg-gray-200 aspect-square mb-3 overflow-hidden">
          {entry.image ? (
            <div className="w-full h-full" onClick={href && onImageClick ? (e) => e.stopPropagation() : undefined}>
              <ContentImage
                image={entry.image}
                alt={entry.title || 'Memory image'}
                className="w-full h-full object-cover cursor-pointer"
                onClick={onImageClick}
              />
            </div>
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
        <p className='mt-2 whitespace-pre-wrap text-sm text-gray-800'>{entry.content}</p>
      )}
    </div>
  );
}
