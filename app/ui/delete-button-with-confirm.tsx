// app/ui/delete-button-with-confirm.tsx

"use client";

import { Button } from "@iam/ui";
import { useState } from "react";
import { TrashIcon } from '@iam/ui'
import { XMarkIcon } from "@heroicons/react/24/outline";

interface DeleteButtonWithConfirmProps {
  onDelete: () => Promise<void>;
  label?: boolean;
}

export default function DeleteButtonWithConfirm({ onDelete, label = false }: DeleteButtonWithConfirmProps) {
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
      {label ? 'Delete' : <TrashIcon className='w-5 h-5' strokeWidth={2} />}
    </Button>
  );
}
