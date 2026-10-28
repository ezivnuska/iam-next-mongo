'use client';

import { useState } from 'react';
import SigninForm from '@/app/ui/auth/signin-form';
import SignupForm from '@/app/ui/auth/signup-form';

export default function AuthPanel({ initialMode = 'signin' }: { initialMode?: 'signin' | 'signup' }) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const toggle = () => setMode(m => m === 'signin' ? 'signup' : 'signin');

  return mode === 'signin'
    ? <SigninForm onToggleMode={toggle} />
    : <SignupForm onToggleMode={toggle} />;
}
