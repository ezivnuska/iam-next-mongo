// app/lib/providers/auth-modal-provider.tsx

'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import AuthModal from '@/app/ui/auth/auth-modal';

type AuthMode = 'signin' | 'signup';

interface AuthModalContextValue {
  isOpen: boolean;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

interface AuthModalProviderProps {
  children: React.ReactNode;
}

export function AuthModalProvider({ children }: AuthModalProviderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<AuthMode>('signin');
  const [callbackUrl, setCallbackUrl] = useState<string>('/');
  const [isFromProtectedRoute, setIsFromProtectedRoute] = useState(false);

  function openAuthModal(mode: AuthMode = 'signin') {
    setInitialMode(mode);
    // Check if there's a stored callback URL from a server redirect
    let storedCallbackUrl: string | null = null;
    if (typeof window !== 'undefined') {
      storedCallbackUrl = sessionStorage.getItem('authCallbackUrl');
      // Clear it immediately after reading to avoid stale data
      if (storedCallbackUrl) {
        sessionStorage.removeItem('authCallbackUrl');
      }
    }
    const finalCallbackUrl = storedCallbackUrl || pathname || '/';
    setCallbackUrl(finalCallbackUrl);
    // Track if this was opened from a protected route redirect
    setIsFromProtectedRoute(!!storedCallbackUrl && storedCallbackUrl !== '/');
    setIsOpen(true);
  }

  function closeAuthModal() {
    setIsOpen(false);

    // Clear any remaining callback URL from sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('authCallbackUrl');

      // If the modal was opened from a protected route redirect,
      // clean up the URL immediately to prevent AuthRedirectHandler from reopening
      if (isFromProtectedRoute) {
        const url = new URL(window.location.href);
        url.searchParams.delete('auth');
        url.searchParams.delete('callbackUrl');
        window.history.replaceState({}, '', url.toString());
      }
    }

    // If the modal was opened from a protected route redirect,
    // redirect to home when closing without authenticating
    if (isFromProtectedRoute && typeof window !== 'undefined' && pathname !== '/') {
      // Use setTimeout to allow the state updates to complete
      setTimeout(() => {
        window.location.href = '/';
      }, 0);
    }
    setIsFromProtectedRoute(false);
  }

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        initialMode={initialMode}
        callbackUrl={callbackUrl}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}
