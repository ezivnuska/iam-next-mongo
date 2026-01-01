// app/ui/edit-content-button.tsx

'use client';

import { Button } from '@/app/ui/button';
import { PencilIcon } from '@heroicons/react/24/outline';

interface EditContentButtonProps {
  onEdit: () => void;
}

export default function EditContentButton({ onEdit }: EditContentButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onEdit();
  };

  return (
    <Button
      size='sm'
      onClick={handleClick}
      variant='ghost'
      className='text-blue-300 hover:bg-blue-50'
    >
      <PencilIcon className='w-5 h-5' />
    </Button>
  );
}
