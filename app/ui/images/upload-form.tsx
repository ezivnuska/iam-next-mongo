// app/ui/upload-form.tsx

"use client";

import { useState } from "react";
import { useUser } from "@/app/lib/providers/user-provider";
import { uploadFile } from "@/app/lib/actions/upload";
import { useFilePreview } from "@/app/lib/hooks/useFilePreview";
import type { Image } from "@/app/lib/definitions/image";

interface UploadFormProps {
    onUploadSuccess?: (uploadedImage: Image) => void;
    onClose?: () => void;
}

export default function UploadForm({ onUploadSuccess, onClose }: UploadFormProps) {
    const { user } = useUser();
    const [file, setFile] = useState<File | null>(null);
    const preview = useFilePreview(file);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user) return;

        setIsUploading(true);
        setError(null);

        try {
          const uploaded: Image = await uploadFile(file);
          onUploadSuccess?.(uploaded);
          onClose?.();
          setFile(null);
        } catch (err: any) {
          setError(err.message || "Upload failed");
        } finally {
          setIsUploading(false);
        }
    };      

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        id="file-upload"
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="hidden"
      />

      <label
        htmlFor="file-upload"
        className="flex h-10 cursor-pointer items-center justify-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400"
      >
        {file?.name || 'Select file'}
      </label>

      {preview && (
        <>
          <img
            src={preview}
            alt="Preview"
            className="max-h-48 rounded-md border"
          />
          <button
            type="submit"
            disabled={isUploading}
            className={`px-4 py-2 rounded text-white font-medium ${
              isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"
            }`}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </>
      )}

      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
