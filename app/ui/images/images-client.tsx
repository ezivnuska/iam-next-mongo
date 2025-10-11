// app/ui/images-client.tsx

"use client";

import { useEffect, useState } from "react";
import Modal from "@/app/ui/modal";
import UploadForm from "@/app/ui/images/upload-form";
import ImageGallery from "./image-gallery";
import type { Image } from "@/app/lib/definitions/image";
import { Button } from "@/app/ui/button";
import { getImages } from "@/app/lib/actions/images";

interface ImagesClientProps {
  authorized?: boolean;
  userId?: string;
}

export default function ImagesClient({ userId }: ImagesClientProps) {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);

    async function initImages() {
        setLoading(true)
        const fetchedImages = await getImages(userId);
        setImages(fetchedImages)
        setLoading(false)
    }

    useEffect(() => {
        initImages()
    }, [])

    const handleUploadSuccess = (uploadedImage: Image) => {
        setImages((prev) => [uploadedImage, ...prev]);
        setModalOpen(false);
    };

    return (
        <div className="mt-4">
            {!userId && (
                <Button
                    onClick={() => setModalOpen(true)}
                    // className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400"
                    className='mb-4'
                >
                    Upload File
                </Button>
            )}

            {!loading
                ? (
                    <ImageGallery
                        images={images}
                        onDeleted={(deletedId) => setImages(prev => prev.filter(img => img.id !== deletedId))}
                        authorized={!userId}
                    />
                )
                : <p>Loading images...</p>
            }

            <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                <h1 className="mb-4 text-2xl font-semibold">Upload a File</h1>
                <UploadForm
                    onUploadSuccess={handleUploadSuccess}
                    onClose={() => setModalOpen(false)}
                />
            </Modal>
        </div>
    );
}
