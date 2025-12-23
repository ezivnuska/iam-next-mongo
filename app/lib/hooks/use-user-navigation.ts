// app/lib/hooks/use-user-navigation.ts

'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/app/lib/providers/user-provider';

export function useUserNavigation() {
  const router = useRouter();
  const { user } = useUser();

  const navigateToUser = (username: string) => {
    if (user?.username === username) {
      router.push('/profile');
    } else {
      router.push(`/social/users/${username}`);
    }
  };

  return { navigateToUser };
}
