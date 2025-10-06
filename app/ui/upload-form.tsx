// app/ui/upload-form.tsx

"use client";

import { useState, useEffect } from "react";
import { useUser } from "../lib/providers/user-provider";
import { uploadFile } from "@/app/lib/actions/upload";
import type { Image } from "@/app/lib/definitions/image";

interface UploadFormProps {
    onUploadSuccess?: (uploadedImage: Image) => void;
    onClose?: () => void;
}

export default function UploadForm({ onUploadSuccess, onClose }: UploadFormProps) {
    const { user } = useUser();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      if (!file) return setPreview(null);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
  
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
      
        if (!user) {
          setError("You must be signed in to upload");
          return;
        }
      
        setIsUploading(true);
        setError(null);
      
        try {
          const uploaded: Image = await uploadFile(file, user);
          if (uploaded) {
            onUploadSuccess?.(uploaded);
            onClose?.();
            setFile(null);
            setPreview(null);
          } else {
            setError("Upload failed");
          }
        } catch (err: any) {
          setError(err.message || "Upload failed");
        } finally {
          setIsUploading(false);
        }
    };      

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        id="file"
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ display: 'none' }}
      />
      
        <div
            style={{ display: 'flex' }}
            className='border-1 flex flex-row h-10 items-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:bg-blue-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-50'
        >
            <label htmlFor="file">
                {file?.name ? file.name : 'Select file'}
            </label>
        </div>

      {preview && (
        <div className="mb-2">
          <img
            src={preview}
            alt="Selected file preview"
            className="mt-1 max-h-48 rounded-md border"
          />
        </div>
      )}

      {preview && (
        <button
            type="submit"
            disabled={isUploading || !file}
            className={`px-4 py-2 rounded text-white font-medium ${
            isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400"
            }`}
        >
            {isUploading ? "Uploading..." : "Upload"}
        </button>
    )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}
