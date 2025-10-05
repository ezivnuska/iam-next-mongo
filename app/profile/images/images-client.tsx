// app/profile/images/images-client.tsx

"use client";

import { useState } from "react";
import Modal from "@/app/ui/modal";
import UploadForm from "@/app/ui/upload-form";
import ImageGallery from "./image-gallery";
import type { Image } from "@/app/lib/definitions/image";
import { Button } from "@/app/ui/button";

interface ImagesClientProps {
  initialImages: Image[];
}

export default function ImagesClient({ initialImages }: ImagesClientProps) {
  const [images, setImages] = useState<Image[]>(initialImages);
  const [isModalOpen, setModalOpen] = useState(false);

  const handleUploadSuccess = (uploadedImage: Image) => {
    setImages((prev) => [uploadedImage, ...prev]);
    setModalOpen(false); // close modal
  };

  return (
    <div className="mt-4">
      <Button
        onClick={() => setModalOpen(true)}
        // className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400"
        className='mb-4'
      >
        Upload File
      </Button>

      <ImageGallery
        images={images}
        onDeleted={(deletedId) => setImages(prev => prev.filter(img => img.id !== deletedId))}
      />

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
