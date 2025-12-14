// app/ui/memories/user-memory.tsx

"use client";

import { formatRelativeTime } from "@/app/lib/utils/format-date";
import { useUser } from "@/app/lib/providers/user-provider";
import type { Memory } from "@/app/lib/definitions/memory";
import EditContentButton from "../edit-content-button";
import FlagContentButton from "../flag-content-button";
import UserContentHeader from "../user-content-header";
import UserAvatar from "../user/user-avatar";
import DeleteButtonWithConfirm from "../delete-button-with-confirm";
import ContentInteractions from "../content-interactions";
import { useRouter } from "next/navigation";
import { getBestVariant, IMAGE_SIZES } from "@/app/lib/utils/images";

interface UserMemoryProps {
  memory: Memory;
  onDeleted: (memoryId: string) => void;
  onEdit: (memory: Memory) => void;
  onFlag: (memory: Memory) => void;
}

export default function UserMemory({ memory, onDeleted, onEdit, onFlag }: UserMemoryProps) {
  const { user } = useUser();
  const imageVariant = getBestVariant(memory.image, IMAGE_SIZES.CONTENT);
  const isAuthor = user?.id === memory.author.id;
  const isAdmin = user?.role === "admin";
  const canDelete = isAuthor || isAdmin;
  const canEdit = isAuthor;

  const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleDelete = async () => {
    const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete memory");
    onDeleted(memory.id);
  };
  
    const router = useRouter();

  const handleUsernameClick = () => {
      if (user?.username === memory.author.username) {
          router.push('/profile');
      } else {
          router.push(`/users/${memory.author.username}`);
      }
  };

  if (!user) return null;

  return (
    <div className="flex flex-row items-stretch mb-4 gap-2">
        <div className="flex flex-col items-center justify-between gap-2 pb-1">
            <div className="flex flex-col items-center gap-2 pb-1">
                <div className="flex w-12 h-12">
                    <UserAvatar
                        username={user.username}
                        avatar={user.avatar}
                        // size={40}
                    />
                </div>
                {memory.shared && (
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded mt-1">
                        Shared
                    </span>
                )}
            </div>
            <FlagContentButton onFlag={() => onFlag(memory)} />
        </div>
        <div className="flex flex-1 flex-col">
            <div className="flex flex-row items-center">
                <div className="flex flex-1 flex-col">
                    <p
                        className="text-lg font-semibold cursor-pointer hover:underline"
                        onClick={handleUsernameClick}
                    >
                        {memory.author.username}
                    </p>
                    <span className="text-sm text-gray-500">{formatRelativeTime(memory.createdAt)}</span>
                </div>
                {canDelete && <DeleteButtonWithConfirm onDelete={handleDelete} />}
            </div>
            <div className="flex flex-row items-stretch">
                <div className="flex flex-1 flex-col pt-2 gap-2">
                    <div>
                        <p className="text-lg font-medium text-gray-700">{memory.title || "Untitled"}</p>
                        <p className="text-sm text-gray-500">{memoryDate}</p>
                    </div>
                    {imageVariant && (
                        <img
                            src={imageVariant.url}
                            alt="Memory image"
                            className="max-w-full max-h-96 rounded my-2 object-cover"
                        />
                    )}
                    {memory.content && <p className="whitespace-pre-wrap">{memory.content}</p>}
                    <ContentInteractions
                        itemId={memory.id}
                        itemType="Memory"
                        initialLiked={memory.likedByCurrentUser}
                        initialLikeCount={memory.likes?.length || 0}
                        initialCommentCount={memory.commentCount || 0}
                    />
                </div>
                <div className='flex flex-col items-start gap-2 pt-1'>
                    {canEdit && <EditContentButton onEdit={() => onEdit(memory)} />}
                </div>
            </div>
        </div>
      </div>
    );
  }
