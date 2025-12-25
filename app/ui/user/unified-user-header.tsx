// app/ui/user/unified-user-header.tsx

'use client';

import { formatRelativeTime } from '@/app/lib/utils/format-date';
import { useUserNavigation } from '@/app/lib/hooks/use-user-navigation';
import { useTheme } from '@/app/lib/hooks/use-theme';
import FlagContentButton from '../flag-content-button';
import UserAvatar from './user-avatar';
import DeleteButtonWithConfirm from '../delete-button-with-confirm';
import OnlineStatusIndicator from './online-status-indicator';
import type { Image as ImageType } from '@/app/lib/definitions/image';

type AvatarType = ImageType | string | null | undefined;

interface UnifiedUserHeaderProps {
  user: {
    id: string;
    username: string;
  };
  avatar?: AvatarType;

  subtitle?: string;
  timestamp?: string;
  bio?: string;

  clickable?: boolean;
  onUsernameClick?: () => void;

  avatarSize?: number;
  variant?: 'compact' | 'default' | 'card';

  actions?: React.ReactNode;
  onFlag?: () => void;
  onDelete?: () => Promise<void>;
  canDelete?: boolean;

  showOnlineStatus?: boolean;
  isOnline?: boolean;

  className?: string;
}

export default function UnifiedUserHeader({
  user,
  avatar,
  subtitle,
  timestamp,
  bio,
  clickable = false,
  onUsernameClick,
  avatarSize = 40,
  variant = 'default',
  actions,
  onFlag,
  onDelete,
  canDelete,
  showOnlineStatus = false,
  isOnline = false,
  className = '',
}: UnifiedUserHeaderProps) {
  const { navigateToUser } = useUserNavigation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const handleUsernameClick = () => {
    if (clickable) {
      if (onUsernameClick) {
        onUsernameClick();
      } else {
        navigateToUser(user.username);
      }
    }
  };

  const getSecondaryText = () => {
    if (timestamp) {
      return formatRelativeTime(timestamp);
    }
    if (subtitle) {
      return subtitle;
    }
    if (bio) {
      return bio;
    }
    return null;
  };

  const secondaryText = getSecondaryText();

  const usernameClasses = `font-semibold ${
    clickable ? 'cursor-pointer hover:underline' : ''
  } ${variant === 'compact' ? 'text-sm leading-tight' : ''}`;

  const secondaryClasses = `text-xs ${
    variant === 'card' ? 'text-gray-500 dark:text-gray-400' : ''
  } ${variant === 'compact' ? 'leading-tight' : ''} ${
    bio ? 'truncate' : ''
  }`;

  const containerClasses = {
    compact: 'flex flex-row items-center gap-3 shrink-0',
    default: 'flex flex-1 items-start gap-3',
    card: 'flex items-center gap-3',
  };

  const textContainerClasses = {
    compact: 'flex flex-1 flex-col min-w-0',
    default: 'flex-1 min-w-0',
    card: 'flex flex-1 flex-col',
  };

  const getCompactTextColor = (isDark: boolean) => ({
    color: isDark ? '#ffffff' : '#111827'
  });

  const getCompactSecondaryColor = (isDark: boolean) => ({
    color: isDark ? '#9ca3af' : '#6b7280'
  });

  const renderAvatar = () => {
    const avatarProps = typeof avatar === 'string'
      ? { username: user.username, avatarUrl: avatar, size: avatarSize }
      : { username: user.username, avatar: avatar, size: avatarSize };

    return (
      <div className={showOnlineStatus ? 'relative' : 'shrink-0'}>
        <div style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}>
          <UserAvatar {...avatarProps} />
        </div>
        {showOnlineStatus && (
          <div className='absolute bottom-0 -right-1 z-100'>
            <OnlineStatusIndicator size={14} isOnline={isOnline} />
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    if (actions) {
      return <div className='flex gap-2 shrink-0'>{actions}</div>;
    }

    if (variant === 'default' && canDelete && onDelete) {
      return <DeleteButtonWithConfirm onDelete={onDelete} />;
    }

    if (variant === 'compact') {
      const hasActions = onFlag || (canDelete && onDelete);
      if (!hasActions) return null;

      return (
        <div className='flex flex-row items-center gap-2 shrink-0'>
          {onFlag && <FlagContentButton onFlag={onFlag} />}
          {canDelete && onDelete && <DeleteButtonWithConfirm onDelete={onDelete} />}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`${containerClasses[variant]} ${className}`}>
      {renderAvatar()}

      <div className={textContainerClasses[variant]}>
        {variant === 'default' ? (
          <div className='flex flex-row items-center justify-between mb-2'>
            <div className='flex flex-col flex-1'>
              <p
                className={usernameClasses}
                onClick={handleUsernameClick}
              >
                {user.username}
              </p>
              {secondaryText && (
                <span className={secondaryClasses}>
                  {secondaryText}
                </span>
              )}
            </div>
            {renderActions()}
          </div>
        ) : (
          <>
            <p
              className={usernameClasses}
              onClick={handleUsernameClick}
              style={variant === 'compact' ? getCompactTextColor(isDark) : undefined}
            >
              {user.username}
            </p>
            {secondaryText && (
              <span
                className={secondaryClasses}
                style={variant === 'compact' ? getCompactSecondaryColor(isDark) : undefined}
              >
                {secondaryText}
              </span>
            )}
          </>
        )}
      </div>

      {variant !== 'default' && renderActions()}
    </div>
  );
}
