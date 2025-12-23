// app/lib/hooks/use-content-delete.ts

'use client';

import { useCallback } from 'react';

export function useContentDelete(
  contentType: 'posts' | 'memories' | 'images',
  onDeleted: (id: string) => void
) {
  return useCallback(
    async (id: string) => {
      const res = await fetch(`/api/${contentType}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Failed to delete ${contentType.slice(0, -1)}`);
      onDeleted(id);
    },
    [contentType, onDeleted]
  );
}
