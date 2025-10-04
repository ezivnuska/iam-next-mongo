// app/ui/upload-form.tsx

"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { uploadFile } from "@/app/lib/actions/upload";
import type { Image } from "@/app/lib/definitions/image";

interface UploadFormProps {
  onUploadSuccess?: (uploadedImage: Image) => void;
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate preview
  useEffect(() => {
    if (!file) return setPreview(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    if (!session?.user) {
      setError("You must be signed in to upload");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploaded: Image = await uploadFile(file, session);
      onUploadSuccess?.(uploaded); // Pass new image to parent
      setFile(null);
      setPreview(null);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {preview && (
        <div className="mb-2">
          <p className="text-sm text-gray-600">Preview:</p>
          <img
            src={preview}
            alt="Selected file preview"
            className="mt-1 max-h-48 rounded-md border"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isUploading || !file}
        className={`px-4 py-2 rounded text-white font-medium ${
          isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"
        }`}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}
