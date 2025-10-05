// app/profile/images/image-gallery.tsx

"use client";

import Image from "next/image";
import DeleteButton from "./delete-button";
import type { Image as ImageType } from "@/app/lib/definitions/image";

interface ImageGalleryProps {
  images: ImageType[];
  onDeleted?: (deletedId: string) => void;
}

export default function ImageGallery({ images, onDeleted }: ImageGalleryProps) {
  if (images.length === 0) return <p>No images uploaded yet.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.map((img) => {
        const medium = img.variants.find((v) => v.size === "medium");

        return (
          <div key={img.id} className="relative rounded-lg overflow-hidden shadow w-full h-48">
            {medium?.url ? (
              <>
                <Image
                  src={medium.url}
                  alt={img.alt || "Uploaded image"}
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <DeleteButton
                  imageId={img.id}
                  onDeleted={() => onDeleted?.(img.id)}
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
                No preview
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
