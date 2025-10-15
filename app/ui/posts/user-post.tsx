// app/ui/posts/user-post.tsx

"use client";

import { useUser } from "@/app/lib/providers/user-provider";
import type { Post } from "@/app/lib/definitions/post";
import EditContentButton from "../edit-content-button";
import FlagContentButton from "../flag-content-button";
import UserContentHeader from "../user-content-header";

interface UserPostProps {
  post: Post;
  onDeleted: (postId: string) => void;
  onEdit: (post: Post) => void;
  onFlag: (post: Post) => void;
}

export default function UserPost({ post, onDeleted, onEdit, onFlag }: UserPostProps) {
  const { user } = useUser();
  const medium = post.image?.variants.find((v) => v.size === "medium");
  const isAuthor = user?.id === post.author.id;
  const isAdmin = user?.role === "admin";
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const handleDelete = async () => {
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete post");
    onDeleted(post.id);
  };

  return (
    <div className="mb-4 py-3 rounded-lg bg-white">
      <UserContentHeader
        username={post.author.username}
        avatar={post.author.avatar}
        createdAt={post.createdAt}
        canDelete={canDelete}
        onDelete={handleDelete}
      />
      <div className="flex items-start gap-3">
        <div className="w-10 shrink-0" /> {/* Spacer for alignment */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-start grow gap-2">
              <div className="flex flex-col grow gap-2 overflow-hidden">
                {post.image && (
                  <img
                    src={medium?.url}
                    alt="Post image"
                    className="max-w-full max-h-96 rounded mb-2 object-cover"
                  />
                )}
                <p>{post.content}</p>
                {post.linkUrl && (
                  <a href={post.linkUrl} target="_blank" className="text-blue-500 underline mt-2">
                    [source]
                  </a>
                )}
              </div>
              <div className='shrink'>
                {canEdit && (
                  <EditContentButton onEdit={() => onEdit(post)} />
                )}
                <FlagContentButton onFlag={() => onFlag(post)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
