// app/ui/edit-content-button.tsx

"use client";

import { Button } from "@/app/ui/button";
import { PencilIcon } from "@heroicons/react/24/outline";

interface EditContentButtonProps {
  onEdit: () => void;
}

export default function EditContentButton({ onEdit }: EditContentButtonProps) {
  return (
    <Button
      size='sm'
      onClick={onEdit}
      variant="ghost"
      className="text-blue-600 hover:bg-blue-50"
    >
      <PencilIcon className="w-5 h-5" />
    </Button>
  );
}
