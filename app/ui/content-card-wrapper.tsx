// app/ui/content-card-wrapper.tsx

"use client";

import { formatRelativeTime } from "@/app/lib/utils/format-date";
import UserAvatar from "@/app/ui/user/user-avatar";
import { useUser } from "@/app/lib/providers/user-provider";
import { useRouter } from "next/navigation";
import type { Image as ImageType } from "@/app/lib/definitions/image";

interface ContentCardWrapperProps {
  username: string;
  avatar?: ImageType | null;
  createdAt: string;
  children: React.ReactNode;
}

export default function ContentCardWrapper({ username, avatar, createdAt, children }: ContentCardWrapperProps) {
  const { user } = useUser();
  const router = useRouter();

  const handleUsernameClick = () => {
    if (user?.username === username) {
      router.push('/profile');
    } else {
      router.push(`/users/${username}`);
    }
  };

  return (
    <div className="mb-4 py-3 rounded-lg bg-white">
      <div className="flex items-start gap-3">
        <UserAvatar
          username={username}
          avatar={avatar}
          size={40}
        />
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col">
            <p
              className="font-semibold cursor-pointer hover:underline"
              onClick={handleUsernameClick}
            >
              {username}
            </p>
            <span className="text-xs text-gray-500">{formatRelativeTime(createdAt)}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
