// app/ui/modal.tsx

"use client";

import { ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  isOpen?: boolean;
  onClose: () => void;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
  position?: 'fixed' | 'absolute';
}

export default function Modal({
  children,
  isOpen = true,
  onClose,
  className = 'bg-black/50',
  contentClassName = 'relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-2 shadow-lg',
  position = 'fixed',
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClose();
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent clicks inside content from closing the modal
    e.stopPropagation();
  };

  return (
    <div
      className={`${position} inset-0 z-50 max-w-screen flex items-center justify-center p-3 overflow-y-auto ${className}`}
      onClick={handleBackdropClick}
    >
      <div className={`${contentClassName} my-auto`} onClick={handleContentClick}>
        {children}
      </div>
    </div>
  );
}
