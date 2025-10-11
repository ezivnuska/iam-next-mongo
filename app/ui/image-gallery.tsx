// app/ui/image-gallery.tsx

"use client";

import { useState } from "react";
import Image from "next/image";
import { useUser } from "@/app/lib/providers/user-provider";
import DeleteButton from "@/app/ui/images/delete-image-button";
import AvatarButton from "@/app/ui/user/set-avatar-button";
import type { Image as ImageType } from "@/app/lib/definitions/image";

interface ImageGalleryProps {
  authorized?: boolean;
  images: ImageType[];
  onDeleted?: (deletedId: string) => void;
}

export default function ImageGallery({ authorized, images, onDeleted }: ImageGalleryProps) {
  const { user } = useUser();
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);

  return (
    <>
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
                                    onClick={() => setSelectedImage(img)}
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

        {/* Modal */}
        {selectedImage && (
            <div
                className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
                onClick={() => setSelectedImage(null)}
            >
                <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
                    <Image
                        src={
                            selectedImage.variants.find((v) => v.size === "original")?.url ||
                            selectedImage.variants[0].url
                        }
                        alt={selectedImage.alt || "Full image"}
                        fill
                        style={{ objectFit: "contain" }}
                        sizes="100vw"
                    />
                    <button
                        className="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow text-black"
                        onClick={() => setSelectedImage(null)}
                    >
                        ✕
                    </button>
                </div>
            </div>
        )}
    </>
  );
}
