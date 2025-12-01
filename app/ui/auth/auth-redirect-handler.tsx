// app/ui/auth/auth-redirect-handler.tsx
"use client";

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthModal } from '@/app/lib/providers/auth-modal-provider';
import { useUser } from '@/app/lib/providers/user-provider';

export default function AuthRedirectHandler() {
  const searchParams = useSearchParams();
  const { openAuthModal } = useAuthModal();
  const { user } = useUser();
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Check if auth is required and user is a guest
    const authRequired = searchParams.get('auth') === 'required';
    const callbackUrl = searchParams.get('callbackUrl');

    if (authRequired && user?.isGuest && callbackUrl && !hasTriggered.current) {
      hasTriggered.current = true;
      // Store the callback URL for after authentication
      sessionStorage.setItem('authCallbackUrl', callbackUrl);
      // Open the signin modal (will clear sessionStorage immediately after reading)
      openAuthModal('signin');

      // Clean up the URL without reloading the page
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      url.searchParams.delete('callbackUrl');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, openAuthModal, user]);

  return null;
}
