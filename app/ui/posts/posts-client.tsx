// app/ui/posts/posts-client.tsx

"use client";

import { useState } from "react";
import Modal from "@/app/ui/modal";
import CreatePostForm from "@/app/ui/posts/create-post-form";
import PostList from "@/app/ui/posts/post-list";
import { Button } from "@/app/ui/button";
import type { Post } from "@/app/lib/definitions/post";

interface PostsClientProps {
  initialPosts: Post[];
}

export default function PostsClient({ initialPosts }: PostsClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isModalOpen, setModalOpen] = useState(false);

  const handlePostSuccess = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    setModalOpen(false);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div>
      <Button
        onClick={() => setModalOpen(true)}
        className="mb-4"
      >
        Add Post
      </Button>

      <PostList posts={posts} onDeleted={handlePostDeleted} />

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <h1 className="mb-4 text-2xl font-semibold">Create a Post</h1>
        <CreatePostForm
          onSuccess={handlePostSuccess}
          onClose={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
