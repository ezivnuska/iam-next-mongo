// app/ui/image-upload-input.tsx

"use client";

import { useFilePreview } from "@/app/lib/hooks/useFilePreview";

interface ImageUploadInputProps {
    file: File | null;
    onFileChange: (file: File | null) => void;
    id?: string;
}

export default function ImageUploadInput({ file, onFileChange, id = "image" }: ImageUploadInputProps) {
    const preview = useFilePreview(file);

    return (
        <div>
            <div className="flex flex-row flex-wrap items-center gap-3">
                <input
                    id={id}
                    type="file"
                    accept="image/*"
                    onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                />
                <label
                    htmlFor={id}
                    className="cursor-pointer rounded-lg bg-none px-4 py-1 text-sm text-blue-500 font-medium border-1 border-blue-500 hover:text-white transition-colors hover:bg-blue-500"
                >
                    {file?.name || 'Attach Image'}
                </label>
                {preview && (
                    <button
                        type="button"
                        onClick={() => onFileChange(null)}
                        className="cursor-pointer text-sm text-red-600 hover:text-red-700"
                    >
                        Remove image
                    </button>
                )}
            </div>
            {preview && (
                <div className="mt-2">
                    <img
                        src={preview}
                        alt="Preview"
                        className="max-h-48 rounded-md border"
                    />
                </div>
            )}
        </div>
    );
}
