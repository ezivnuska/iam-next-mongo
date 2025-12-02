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
    <div className="flex flex-row items-start mb-4 gap-2">
        <div className="w-12 h-12">
            <UserAvatar
                username={username}
                avatar={avatar}
                // size={40}
            />
        </div>
        <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col">
                <p
                    className="text-lg font-semibold cursor-pointer hover:underline"
                    onClick={handleUsernameClick}
                >
                    {username}
                </p>
                <span className="text-sm text-gray-500">{formatRelativeTime(createdAt)}</span>
            </div>
          {children}
        </div>
    </div>
  );
}
