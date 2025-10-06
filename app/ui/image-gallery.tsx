// app/ui/image-gallery.tsx

"use client";

import Image from "next/image";
import { useUser } from "@/app/lib/providers/user-provider";
import DeleteButton from "@/app/ui/delete-image-button";
import AvatarButton from "@/app/ui/set-avatar-button";
import type { Image as ImageType } from "@/app/lib/definitions/image";

interface ImageGalleryProps {
  authorized?: boolean;
  images: ImageType[];
  onDeleted?: (deletedId: string) => void;
}

export default function ImageGallery({ authorized, images, onDeleted }: ImageGalleryProps) {
  const { user } = useUser();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.length
        ? images.map((img) => {
            const medium = img.variants.find((v) => v.size === "medium");
            const isAvatar = user?.avatar?.id === img.id;
            return (
                <div
                    key={img.id}
                    className="relative rounded-lg overflow-hidden shadow w-full h-48"
                >
                    {medium?.url ? (
                        <>
                            <Image
                                src={medium.url}
                                alt={img.alt || "Uploaded image"}
                                fill
                                style={{ objectFit: "cover" }}
                                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            />
                            {authorized && (
                                <AvatarButton
                                    imageId={img.id}
                                    isAvatar={isAvatar}
                                />
                            )}
                            {authorized && (
                                <DeleteButton
                                    imageId={img.id}
                                    onDeleted={() => onDeleted?.(img.id)}
                                />
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
                            No preview
                        </div>
                    )}
                </div>
            );
        })
        : <p>No images uploaded yet.</p>
      }
    </div>
  );
}
