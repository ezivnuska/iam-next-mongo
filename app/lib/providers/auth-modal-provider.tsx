// app/lib/providers/auth-modal-provider.tsx

"use client";

import { createContext, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import AuthModal from "@/app/ui/auth/auth-modal";

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
    setCallbackUrl(storedCallbackUrl || pathname || '/');
    setIsOpen(true);
  }

  function closeAuthModal() {
    setIsOpen(false);
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
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
