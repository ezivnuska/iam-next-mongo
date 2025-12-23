// app/lib/hooks/use-content-permissions.ts

'use client';

import { useUser } from '@/app/lib/providers/user-provider';

export function useContentPermissions(authorId: string) {
  const { user } = useUser();
  const isAuthor = user?.id === authorId;
  const isAdmin = user?.role === 'admin';

  return {
    isAuthor,
    isAdmin,
    canEdit: isAuthor,
    canDelete: isAuthor || isAdmin,
  };
}
