// app/ui/upload-form.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/app/lib/providers/user-provider";
import { uploadFile } from "@/app/lib/actions/upload";
import { useFilePreview } from "@/app/lib/hooks/useFilePreview";
import { ImageIcon, useScreenOrientation } from "@iam/ui";
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
    const orientation = useScreenOrientation();
    const inputRef = useRef<HTMLInputElement>(null);
    const hasAutoOpenedRef = useRef(false);

    useEffect(() => {
        if (hasAutoOpenedRef.current) return;
        hasAutoOpenedRef.current = true;
        inputRef.current?.click();
    }, []);

    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        const handleCancel = () => { if (!file) onClose?.(); };
        input.addEventListener('cancel', handleCancel);
        return () => input.removeEventListener('cancel', handleCancel);
    }, [file, onClose]);

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
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
          setIsUploading(false);
        }
    };      

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        ref={inputRef}
        id="file-upload"
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
        className="hidden"
      />

      {!preview && (
        <div
          className="flex items-center justify-center py-8 cursor-pointer text-white/50 hover:text-white transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="w-16 h-16" />
        </div>
      )}

      {preview && (
        <div className={`flex ${orientation === 'landscape' ? 'flex-row' : 'flex-col'} gap-4`}>
          <div className={`${orientation === 'landscape' ? 'flex-1' : ''} flex items-center justify-center`}>
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-[calc(90vh-10rem)] object-contain rounded-md border cursor-pointer"
              onClick={() => inputRef.current?.click()}
            />
          </div>
          <div className={`${orientation === 'landscape' ? 'flex-1' : 'flex-shrink-0 py-4'} flex flex-col items-center justify-center gap-3`}>
            <button
              type="submit"
              disabled={isUploading}
              className={`px-6 py-2 rounded font-medium ${
                isUploading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded font-medium bg-black text-white border border-white hover:bg-neutral-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}
