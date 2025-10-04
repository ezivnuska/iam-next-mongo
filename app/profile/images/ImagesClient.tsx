// app/profile/images/ImagesClient.tsx

"use client";

import { useState } from "react";
import Modal from "@/app/ui/modal";
import UploadForm from "@/app/ui/upload-form";
import ImageGallery from "./ImageGallery";
import type { Image } from "@/app/lib/definitions/image";

interface ImagesClientProps {
  initialImages: Image[];
}

export default function ImagesClient({ initialImages }: ImagesClientProps) {
  const [images, setImages] = useState(initialImages);
  const [isModalOpen, setModalOpen] = useState(false);

  const handleUploadSuccess = (uploadedImage: Image) => {
    setImages([uploadedImage, ...images]);
    setModalOpen(false);
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => setModalOpen(true)}
        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400"
      >
        Upload File
      </button>

      <ImageGallery initialImages={images} />

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <h1 className="mb-4 text-2xl font-semibold text-gray-800">
          Upload a File
        </h1>
        <UploadForm onUploadSuccess={handleUploadSuccess} />
      </Modal>
    </div>
  );
}
