// app/lib/hooks/use-is-dark.ts

import { useTheme } from './use-theme';

/**
 * Custom hook that returns whether dark mode is active
 * Simplifies the common pattern of checking resolvedTheme === 'dark'
 */
export function useIsDark(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
}
