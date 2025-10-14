// app/ui/memories/create-memory-form.tsx

"use client";

import { useState } from "react";
import { Button } from "@/app/ui/button";
import { uploadFile } from "@/app/lib/actions/upload";
import ImageUploadInput from "@/app/ui/image-upload-input";
import type { Memory } from "@/app/lib/definitions/memory";

interface CreateMemoryFormProps {
  onSuccess: (memory: Memory) => void;
  onClose: () => void;
  editMemory?: Memory;
}

export default function CreateMemoryForm({ onSuccess, onClose, editMemory }: CreateMemoryFormProps) {
  // Helper to get local date string in YYYY-MM-DD format
  const getLocalDateString = (dateString?: string) => {
    const d = dateString ? new Date(dateString) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getLocalDateString(editMemory?.date));
  const [title, setTitle] = useState(editMemory?.title || "");
  const [content, setContent] = useState(editMemory?.content || "");
  const [shared, setShared] = useState(editMemory?.shared || false);
  const [file, setFile] = useState<File | null>(null);
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

      const url = editMemory ? `/api/memories/${editMemory.id}` : "/api/memories";
      const method = editMemory ? "PUT" : "POST";

      // Create date at noon local time to avoid timezone issues
      const localDate = new Date(date + 'T12:00:00');

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: localDate.toISOString(),
          title,
          content,
          shared,
          imageId,
        }),
      });

      if (!response.ok) {
        throw new Error(editMemory ? "Failed to update memory" : "Failed to create memory");
      }

      const newMemory = await response.json();
      onSuccess(newMemory);
    } catch (err: any) {
      setError(err.message || "Failed to create memory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="Untitled"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Memory
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={6}
          maxLength={2000}
          placeholder="Write about this memory..."
        />
        <div className="text-sm text-gray-500 mt-1">
          {content.length}/2000
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="shared"
          type="checkbox"
          checked={shared}
          onChange={(e) => setShared(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="shared" className="ml-2 block text-sm text-gray-700">
          Share with others
        </label>
      </div>

      <ImageUploadInput file={file} onFileChange={setFile} />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          type="submit"
          disabled={loading || !(content.trim() || file)}
        >
          {loading ? "Saving..." : (editMemory ? "Update Memory" : "Save Memory")}
        </Button>
        <Button
          type="button"
          onClick={onClose}
          disabled={loading}
          variant="secondary"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
