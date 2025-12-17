// app/ui/flex-container.tsx

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface FlexContainerProps {
    children: ReactNode;
    direction?: 'row' | 'col';
    className?: string;
}

/**
 * A flex container that fills available space and allows proper shrinking.
 * Uses the standard flex-1, min-h-0, min-w-0 pattern.
 */
export function FlexContainer({ children, direction = 'col', className = '' }: FlexContainerProps) {
    return (
        <div className={clsx(
            'flex flex-1 min-h-0 min-w-0',
            direction === 'col' ? 'flex-col' : 'flex-row',
            className
        )}>
            {children}
        </div>
    );
}

interface FlexCenterProps {
    children: ReactNode;
    className?: string;
}

/**
 * A flex container that centers its children both horizontally and vertically.
 * Fills available space.
 */
export function FlexCenter({ children, className = '' }: FlexCenterProps) {
    return (
        <div className={clsx(
            'flex flex-1 min-h-0 min-w-0 items-center justify-center',
            className
        )}>
            {children}
        </div>
    );
}
