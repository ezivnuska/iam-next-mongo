// app/ui/posts/post-list.tsx

"use client";

import DeletePostButton from "@/app/ui/posts/delete-post-button";
import UserAvatar from "@/app/ui/user/user-avatar";
import { useUser } from "@/app/lib/providers/user-provider";
import { formatRelativeTime } from "@/app/lib/utils/format-date";
import type { Post } from "@/app/lib/definitions/post";

interface PostListProps {
  posts: Post[];
  onDeleted: (postId: string) => void;
}

export default function PostList({ posts, onDeleted }: PostListProps) {
  const { user } = useUser();

  if (posts.length === 0) {
    return <p>No posts</p>;
  }

  return (
    <div>
      {posts.map((post) => {
        const medium = post.image?.variants.find((v) => v.size === "medium");
        const isAuthor = user?.id === post.author.id;
        const isAdmin = user?.role === "admin";
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
              {canDelete && (
                <DeletePostButton
                  postId={post.id}
                  onDeleted={() => onDeleted(post.id)}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
