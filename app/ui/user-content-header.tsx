// app/ui/user-content-header.tsx

"use client";

import DeleteButtonWithConfirm from "@/app/ui/delete-button-with-confirm";
import UserAvatar from "@/app/ui/user/user-avatar";
import { formatRelativeTime } from "@/app/lib/utils/format-date";
import type { Image as ImageType } from "@/app/lib/definitions/image";

interface UserContentHeaderProps {
  username: string;
  avatar?: ImageType | null;
  createdAt: string;
  canDelete: boolean;
  onDelete: () => Promise<void>;
}

export default function UserContentHeader({
  username,
  avatar,
  createdAt,
  canDelete,
  onDelete
}: UserContentHeaderProps) {
  return (
    <div className="flex flex-1 items-start gap-3 border">
        {/* <div className="w-12 h-12 border">
            <UserAvatar
                username={username}
                avatar={avatar}
                // size={40}
            />
      </div> */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-row items-center justify-between mb-2">
          <div className="flex flex-col">
            <p className="font-semibold">{username}</p>
            <span className="text-xs text-gray-500">{formatRelativeTime(createdAt)}</span>
          </div>
          {canDelete && (
            <DeleteButtonWithConfirm onDelete={onDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
