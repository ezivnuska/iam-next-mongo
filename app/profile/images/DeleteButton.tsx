// app/profile/images/DeleteButton.tsx

"use client";

import { useState } from "react";

interface DeleteButtonProps {
  imageId: string;
  onDeleted: () => void;
}

export default function DeleteButton({ imageId, onDeleted }: DeleteButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete image");
      }

      onDeleted();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Failed to delete image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs z-10 hover:bg-red-500"
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
