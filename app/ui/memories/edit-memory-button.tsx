// app/ui/memories/edit-memory-button.tsx

"use client";

import { Button } from "@/app/ui/button";
import { PencilIcon } from "@heroicons/react/24/outline";

interface EditMemoryButtonProps {
  onEdit: () => void;
}

export default function EditMemoryButton({ onEdit }: EditMemoryButtonProps) {
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
