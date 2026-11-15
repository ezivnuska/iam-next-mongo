// app/ui/auth/auth-modal.tsx
"use client";

import { Modal } from '@iam/ui';
import SigninForm from './signin-form';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  callbackUrl?: string;
}

export default function AuthModal({ isOpen, onClose, callbackUrl = '/' }: AuthModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-md">
        <SigninForm callbackUrl={callbackUrl} />
      </div>
    </Modal>
  );
}
