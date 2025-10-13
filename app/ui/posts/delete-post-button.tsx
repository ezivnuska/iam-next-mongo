// app/ui/posts/delete-post-button.tsx

"use client";

import { Button } from "@/app/ui/button";
import { useState } from "react";
import { TrashIcon } from '@/app/ui/icons'
import { XMarkIcon } from "@heroicons/react/24/outline";

interface DeletePostButtonProps {
  postId: string;
  onDeleted: () => void;
}

export default function DeletePostButton({ postId, onDeleted }: DeletePostButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");

      onDeleted();
    } catch (err) {
      console.error(err);
      alert("Failed to delete post");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <Button
          size='sm'
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          variant="secondary"
        >
          <XMarkIcon className="w-5 h-5" />
        </Button>
        <Button
          size='sm'
          onClick={handleDelete}
          disabled={loading}
          className="bg-red-600 text-white hover:bg-red-500"
        >
          <TrashIcon className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      size='sm'
      onClick={() => setShowConfirm(true)}
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
    >
      <TrashIcon className="w-5 h-5" />
    </Button>
  );
}
