// app/ui/delete-button-with-confirm.tsx

"use client";

import { Button } from "@/app/ui/button";
import { useState } from "react";
import { TrashIcon } from '@/app/ui/icons'
import { XMarkIcon } from "@heroicons/react/24/outline";

interface DeleteButtonWithConfirmProps {
  onDelete: () => Promise<void>;
}

export default function DeleteButtonWithConfirm({ onDelete }: DeleteButtonWithConfirmProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleShowConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <Button
          size='sm'
          onClick={handleDelete}
          disabled={loading}
          variant='confirm'
        >
          {loading ? "Deleting..." : "Delete"}
        </Button>
        {!loading && (
          <Button
            size='sm'
            onClick={handleCancel}
            disabled={loading}
            variant='secondary'
          >
            <XMarkIcon
              className={`w-5 h-5 text-gray-500`}
              strokeWidth={2}
            />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      size='sm'
      onClick={handleShowConfirm}
      variant='warn'
    >
      <TrashIcon
        className={`w-5 h-5`}
        strokeWidth={2}
      />
    </Button>
  );
}
