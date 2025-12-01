// app/ui/auth/auth-modal.tsx
"use client";

import { useState } from 'react';
import Modal from '@/app/ui/modal';
import SigninForm from './signin-form';
import SignupForm from './signup-form';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  callbackUrl?: string;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'signin', callbackUrl = '/' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-md">
        {mode === 'signin' ? (
          <SigninForm onToggleMode={toggleMode} callbackUrl={callbackUrl} />
        ) : (
          <SignupForm onToggleMode={toggleMode} callbackUrl={callbackUrl} />
        )}
      </div>
    </Modal>
  );
}
