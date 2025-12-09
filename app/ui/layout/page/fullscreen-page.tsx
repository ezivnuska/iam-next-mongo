// app/ui/layout/fullscreen-page.tsx

import { clsx } from 'clsx';

interface FullscreenPageProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Fullscreen Page Component
 *
 * A layout component that constrains content to the full viewport height.
 * Uses modern dvh units for better mobile browser compatibility.
 *
 * @param children - Content to render within the fullscreen container
 * @param className - Optional additional CSS classes
 *
 */
export default function FullscreenPage({ children, className }: FullscreenPageProps) {
  return (
    <div className={clsx('h-dvh overflow-hidden', className)}>
      {children}
    </div>
  );
}
