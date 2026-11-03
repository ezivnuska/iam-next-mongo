"use client";

import { useState } from "react";
import { Button } from "@/app/ui/button";
import { uploadFile } from "@/app/lib/actions/upload";
import ImageUploadInput from "@/app/ui/image-upload-input";
import type { Entry } from "@/app/lib/definitions/entry";

interface CreateEntryFormProps {
  onSuccess: (entry: Entry) => void;
  onClose: () => void;
  editItem?: Entry;
}

export default function CreateEntryForm({ onSuccess, onClose, editItem }: CreateEntryFormProps) {
  const getLocalDateString = (dateString?: string) => {
    const d = dateString ? new Date(dateString) : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [contentType, setContentType] = useState<'memory' | 'post'>(editItem?.contentType ?? 'post');
  const [date, setDate] = useState(getLocalDateString(editItem?.date));
  const [title, setTitle] = useState(editItem?.title ?? "");
  const [content, setContent] = useState(editItem?.content ?? "");
  const [shared, setShared] = useState(editItem?.shared ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editItem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageId: string | undefined;
      if (file) {
        const uploaded = await uploadFile(file);
        imageId = uploaded.id;
      }

      const url = isEditing ? `/api/entries/${editItem.id}` : "/api/entries";
      const method = isEditing ? "PUT" : "POST";

      const body: Record<string, unknown> = { contentType, content, imageId };
      if (contentType === 'memory') {
        body.date = new Date(date + 'T12:00:00').toISOString();
        body.title = title;
        body.shared = shared;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(isEditing ? "Failed to update entry" : "Failed to create entry");

      onSuccess(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = contentType === 'post'
    ? !!(content.trim() || file)
    : !!(date && content.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle — locked when editing */}
      <div className="flex rounded-md border border-gray-300 overflow-hidden w-fit">
        {(['post', 'memory'] as const).map((type) => (
          <button
            key={type}
            type="button"
            disabled={isEditing}
            onClick={() => setContentType(type)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize
              ${contentType === type
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'}
              ${isEditing ? 'cursor-default opacity-60' : 'cursor-pointer'}
            `}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Memory-only fields */}
      {contentType === 'memory' && (
        <>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">Date</label>
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
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
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
        </>
      )}

      {/* Content */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          {contentType === 'memory' ? 'Remember when?' : "What's on your mind?"}
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required={contentType === 'memory'}
          rows={contentType === 'memory' ? 6 : 4}
          maxLength={2000}
          placeholder={contentType === 'memory' ? 'Write about this memory...' : 'Share your thoughts...'}
          className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
        />
        <div className="text-sm text-gray-500 mt-1">{content.length}/2000</div>
      </div>

      {/* Memory-only: shared toggle */}
      {contentType === 'memory' && (
        <div className="flex items-center">
          <input
            id="shared"
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="shared" className="ml-2 block text-sm text-gray-700">Share with others</label>
        </div>
      )}

      <ImageUploadInput file={file} onFileChange={setFile} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="submit" disabled={loading || !canSubmit}>
          {loading ? "Saving..." : isEditing ? `Update ${contentType}` : `Save ${contentType}`}
        </Button>
        <Button type="button" onClick={onClose} disabled={loading} variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
