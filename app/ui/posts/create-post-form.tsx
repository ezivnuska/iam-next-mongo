// app/ui/posts/create-post-form.tsx

"use client";

import { useState } from "react";
import { Button } from "@/app/ui/button";
import { uploadFile } from "@/app/lib/actions/upload";
import { useFilePreview } from "@/app/lib/hooks/useFilePreview";
import type { Post } from "@/app/lib/definitions/post";

interface CreatePostFormProps {
  onSuccess: (post: Post) => void;
  onClose: () => void;
}

export default function CreatePostForm({ onSuccess, onClose }: CreatePostFormProps) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const preview = useFilePreview(file);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageId: string | undefined;

      if (file) {
        const uploadedImage = await uploadFile(file);
        imageId = uploadedImage.id;
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          imageId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create post");
      }

      const newPost = await response.json();
      onSuccess(newPost);
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          What's on your mind?
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          maxLength={1000}
          placeholder="Share your thoughts..."
        />
        <div className="text-sm text-gray-500 mt-1">
          {content.length}/1000
        </div>
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
          Attach Image (optional)
        </label>
        <input
          id="image"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        <label
          htmlFor="image"
          className="flex h-10 cursor-pointer items-center justify-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400"
        >
          {file?.name || 'Select image'}
        </label>
        {preview && (
          <div className="mt-2">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 rounded-md border"
            />
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Remove image
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          onClick={onClose}
          disabled={loading}
          variant="secondary"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || (!content.trim() && !file)}
        >
          {loading ? "Posting..." : "Post"}
        </Button>
      </div>
    </form>
  );
}
