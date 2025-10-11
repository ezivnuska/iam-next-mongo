// app/upload/page.tsx

"use client";

import { useState } from "react";
import Modal from "@/app/ui/modal";
import UploadForm from "@/app/ui/images/upload-form";

export const metadata = {
  title: "Upload File",
  description: "Upload an image to the server",
};

export default function UploadModalPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <h1 className="mb-4 text-2xl font-semibold text-gray-800">
        Upload an Image
      </h1>
      <UploadForm />
    </Modal>
  );
}
