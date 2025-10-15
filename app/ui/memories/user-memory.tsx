// app/ui/memories/user-memory.tsx

"use client";

import { useUser } from "@/app/lib/providers/user-provider";
import type { Memory } from "@/app/lib/definitions/memory";
import EditContentButton from "../edit-content-button";
import FlagContentButton from "../flag-content-button";
import UserContentHeader from "../user-content-header";

interface UserMemoryProps {
  memory: Memory;
  onDeleted: (memoryId: string) => void;
  onEdit: (memory: Memory) => void;
  onFlag: (memory: Memory) => void;
}

export default function UserMemory({ memory, onDeleted, onEdit, onFlag }: UserMemoryProps) {
  const { user } = useUser();
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

  const handleDelete = async () => {
    const res = await fetch(`/api/memories/${memory.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete memory");
    onDeleted(memory.id);
  };

  return (
    <div className="mb-4 py-3 rounded-lg bg-white">
      <UserContentHeader
        username={memory.author.username}
        avatar={memory.author.avatar}
        createdAt={memory.createdAt}
        canDelete={canDelete}
        onDelete={handleDelete}
      />
      <div className="flex items-start gap-3">
        <div className="w-10 shrink-0" /> {/* Spacer for alignment */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-start grow gap-2">
              <div className="flex flex-col grow gap-2 overflow-hidden">
                <div className="flex flex-col mb-1 gap-2">
                  <div>
                    <p className="text-lg font-medium text-gray-700">{memory.title || "Untitled"}</p>
                    <p className="text-sm text-gray-500">{memoryDate}</p>
                    {memory.shared && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded mt-1">
                        Shared
                      </span>
                    )}
                  </div>
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
              <div className='shrink'>
                {canEdit && (
                  <EditContentButton onEdit={() => onEdit(memory)} />
                )}
                <FlagContentButton onFlag={() => onFlag(memory)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
