// app/ui/upload-form.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/app/lib/actions/upload";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Generate preview when file changes
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl); // memory clean up
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const url = await uploadFile(file);
      if (url) {
        setUploadedUrl(url);
        setPreview(url);
        setFile(null);

        // Redirect after 1 second
        setTimeout(() => {
          router.push("/profile/images");
        }, 1000);
      } else {
        setError("Upload failed: No URL returned");
      }
    } catch (err: any) {
      console.error(err);
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

      {uploadedUrl && (
        <div className="mt-2">
          <p className="text-sm text-green-600">Upload successful! Redirecting...</p>
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            View uploaded file
          </a>
        </div>
      )}

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}
