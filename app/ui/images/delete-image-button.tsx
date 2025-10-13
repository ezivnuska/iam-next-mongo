// app/ui/delete-image-button.tsx

"use client";

import { Button } from "@/app/ui/button";
import { useState } from "react";
import { TrashIcon } from '@/app/ui/icons'
import { XMarkIcon } from "@heroicons/react/24/outline";

interface DeleteButtonProps {
  imageId: string;
  onDeleted: () => void;
}

export default function DeleteButton({ imageId, onDeleted }: DeleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete image");

      onDeleted();
    } catch (err) {
      console.error(err);
      alert("Failed to delete image");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <Button
          size='sm'
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="group cursor-pointer bg-white text-gray-500 px-2 py-1 rounded text-xs hover:bg-gray-500 hover:text-white"
        >
            <XMarkIcon
                className={`w-5 h-5 text-gray-500 group-hover:text-white`}
                strokeWidth={2}
            />
          {/* Cancel */}
        </Button>
        <Button
          size='sm'
          onClick={handleDelete}
          disabled={loading}
          className="group cursor-pointer bg-white text-red-500 hover:bg-red-500 px-2 py-1 rounded text-xs"
        >
            <TrashIcon
                className={`w-5 h-5 text-red-500 group-hover:text-white`}
                strokeWidth={2}
            />
          {/* {loading ? "Deleting..." : "Delete"} */}
        </Button>
      </div>
    );
  }

  return (
    <Button
      size='sm'
      onClick={() => setShowConfirm(true)}
      className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
    >
      Delete
    </Button>
  );
}
