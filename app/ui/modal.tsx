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
  contentClassName = 'relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg',
  showCloseButton = false,
  position = 'fixed',
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not any child
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent backdrop click
    e.stopPropagation();
  };

  return (
    <div
      className={`${position} inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto ${className}`}
      onClick={handleBackdropClick}
    >
      <div className={`${contentClassName} my-auto`} onClick={handleContentClick}>
        {showCloseButton && (
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl leading-none"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
