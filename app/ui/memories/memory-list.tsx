// app/ui/memories/memory-list.tsx

"use client";

import DeleteButtonWithConfirm from "@/app/ui/delete-button-with-confirm";
import UserAvatar from "@/app/ui/user/user-avatar";
import { useUser } from "@/app/lib/providers/user-provider";
import { formatRelativeTime } from "@/app/lib/utils/format-date";
import type { Memory } from "@/app/lib/definitions/memory";
import EditContentButton from "../edit-content-button";
import FlagContentButton from "../flag-content-button";

interface MemoryListProps {
  items: Memory[];
  onDeleted: (memoryId: string) => void;
  onEdit: (memory: Memory) => void;
onFlag: (memory: Memory) => void;
}

export default function MemoryList({ items, onDeleted, onEdit, onFlag }: MemoryListProps) {
  const { user } = useUser();

  if (items.length === 0) {
    return <p>No memories</p>;
  }

  return (
    <div>
      {items.map((memory) => {
        const medium = memory.image?.variants.find((v) => v.size === "medium");
        const isAuthor = user?.id === memory.author.id;
        const isAdmin = user?.role === "admin";
        const canDelete = isAuthor || isAdmin;
        const canEdit = isAuthor;

        const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        return (
          <div key={memory.id} className="mb-4 p-4 border rounded-lg bg-white shadow-sm">
            <div className="flex items-start gap-3">
              <UserAvatar
                username={memory.author.username}
                avatar={memory.author.avatar}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col mb-2">
                  <p className="font-semibold">{memory.author.username}</p>
                  <span className="text-xs text-gray-500">{formatRelativeTime(memory.createdAt)}</span>
                </div>
                <div className="mb-2">
                  <p className="text-lg font-medium text-gray-700">{memory.title || "Untitled"}</p>
                  <p className="text-sm text-gray-500">{memoryDate}</p>
                  {memory.shared && (
                    <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded mt-1">
                      Shared
                    </span>
                  )}
                </div>
                {memory.image && (
                  <img
                    src={medium?.url}
                    alt="Memory image"
                    className="max-w-full max-h-96 rounded mb-2 object-cover"
                  />
                )}
                <p className="whitespace-pre-wrap">{memory.content}</p>
              </div>

                <div className="flex flex-col items-end gap-2">
                    {canDelete && (
                        <DeleteButtonWithConfirm
                            onDelete={async () => {
                                const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
                                if (!res.ok) throw new Error("Failed to delete memory");
                                onDeleted(memory.id);
                            }}
                        />
                    )}
                    {canEdit && (
                        <EditContentButton onEdit={() => onEdit(memory)} />
                    )}
                    <FlagContentButton onFlag={() => onFlag(memory)} />
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
