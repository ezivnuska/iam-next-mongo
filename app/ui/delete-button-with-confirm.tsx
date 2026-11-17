// app/ui/delete-button-with-confirm.tsx

"use client";

import { Button } from "@iam/ui";
import { useState } from "react";
import { TrashIcon } from '@iam/ui'
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useModal } from "@/app/lib/hooks/use-modal";

interface DeleteButtonWithConfirmProps {
  onDelete: () => Promise<void>;
}

export default function DeleteButtonWithConfirm({ onDelete }: DeleteButtonWithConfirmProps) {
  const [loading, setLoading] = useState(false);
  const { isOpen: showConfirm, open: openConfirm, close: closeConfirm } = useModal();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
      closeConfirm();
    }
  };

  const handleShowConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    openConfirm();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    closeConfirm();
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
      <TrashIcon className='w-5 h-5' strokeWidth={2} />
    </Button>
  );
}
