// app/ui/posts/post-list.tsx

"use client";

import DeleteButtonWithConfirm from "@/app/ui/delete-button-with-confirm";
import UserAvatar from "@/app/ui/user/user-avatar";
import { useUser } from "@/app/lib/providers/user-provider";
import { formatRelativeTime } from "@/app/lib/utils/format-date";
import type { Post } from "@/app/lib/definitions/post";
import EditContentButton from "../edit-content-button";
import FlagContentButton from "../flag-content-button";

interface PostListProps {
  items: Post[];
  onDeleted: (postId: string) => void;
  onEdit: (post: Post) => void;
  onFlag: (post: Post) => void;
}

export default function PostList({ items, onDeleted, onEdit, onFlag }: PostListProps) {
  const { user } = useUser();

  if (items.length === 0) {
    return <p>No posts</p>;
  }

  return (
    <div>
      {items.map((post) => {
        const medium = post.image?.variants.find((v) => v.size === "medium");
        const isAuthor = user?.id === post.author.id;
        const isAdmin = user?.role === "admin";
        const canEdit = isAuthor;
        const canDelete = isAuthor || isAdmin;

        return (
            <div key={post.id} className="mb-2 p-2 border rounded">
                <div className="flex items-start gap-3">
                    <UserAvatar
                        username={post.author.username}
                        avatar={post.author.avatar}
                        size={40}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col mb-2">
                            <p className="font-semibold">{post.author.username}</p>
                            <span className="text-xs text-gray-500">{formatRelativeTime(post.createdAt)}</span>
                        </div>
                        {post.image && (
                            <img
                                src={medium?.url}
                                alt="Post image"
                                className="max-w-full max-h-96 rounded mb-2 object-cover"
                            />
                        )}
                        <p>{post.content}</p>
                        {post.linkUrl && (
                            <a href={post.linkUrl} target="_blank" className="text-blue-500 underline mt-2 block">
                                {post.linkPreview?.title || post.linkUrl}
                            </a>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {canDelete && (
                            <DeleteButtonWithConfirm
                                onDelete={async () => {
                                    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
                                    if (!res.ok) throw new Error("Failed to delete post");
                                    onDeleted(post.id);
                                }}
                            />
                        )}
                        {canEdit && (
                            <EditContentButton onEdit={() => onEdit(post)} />
                        )}
                        <FlagContentButton onFlag={() => onFlag(post)} />
                    </div>
                </div>
            </div>
        );
      })}
    </div>
  );
}
