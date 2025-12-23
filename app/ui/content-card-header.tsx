// app/ui/content-card-header.tsx

'use client';

import { formatRelativeTime } from '@/app/lib/utils/format-date';
import { useUserNavigation } from '@/app/lib/hooks/use-user-navigation';
import { useTheme } from '@/app/lib/hooks/use-theme';
import FlagContentButton from './flag-content-button';
import UserAvatar from './user/user-avatar';
import DeleteButtonWithConfirm from './delete-button-with-confirm';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface ContentCardHeaderProps {
  author: { id: string; username: string };
  avatar?: ImageType | null;
  createdAt: string;
  onFlag?: () => void;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;
  avatarSize?: number;
}

export default function ContentCardHeader({
  author,
  avatar,
  createdAt,
  onFlag,
  onDelete,
  canDelete,
  avatarSize = 40,
}: ContentCardHeaderProps) {
  const { navigateToUser } = useUserNavigation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className='flex flex-row items-center gap-3 shrink-0'>
      <div className='shrink-0' style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}>
        <UserAvatar
          username={author.username}
          avatar={avatar}
          size={avatarSize}
        />
      </div>
      <div className='flex flex-1 flex-col min-w-0'>
        <p
          className='text-sm font-semibold cursor-pointer hover:underline leading-tight'
          onClick={() => navigateToUser(author.username)}
          style={{ color: isDark ? '#ffffff' : '#111827' }}
        >
          {author.username}
        </p>
        <span className='text-xs leading-tight' style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          {formatRelativeTime(createdAt)}
        </span>
      </div>
      {(onFlag || (canDelete && onDelete)) && (
        <div className='flex flex-row items-center gap-2 shrink-0'>
          {onFlag && <FlagContentButton onFlag={onFlag} />}
          {canDelete && onDelete && <DeleteButtonWithConfirm onDelete={onDelete} />}
        </div>
      )}
    </div>
  );
}
