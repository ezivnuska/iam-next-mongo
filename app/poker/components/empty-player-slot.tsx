// app/poker/components/empty-player-slot.tsx

'use client';

import clsx from 'clsx';
import type { PlayerOrientation } from '@/app/poker/lib/definitions/poker';

interface EmptyPlayerSlotProps {
  orientation: PlayerOrientation;
}

/**
 * Get flex direction classes based on orientation
 * Maps orientation to Tailwind flex classes
 */
function getOrientationClasses(orientation: PlayerOrientation): string {
  const orientationMap = {
    'ltr': 'flex-row',
    'rtl': 'flex-row-reverse',
    'ttb': 'flex-col',
    'btt': 'flex-col-reverse',
  };

  return orientationMap[orientation];
}

/**
 * Empty player slot placeholder component
 * Shows a dashed circle with a + icon to indicate an available seat
 */
export default function EmptyPlayerSlot({ orientation }: EmptyPlayerSlotProps) {
  const orientationClasses = getOrientationClasses(orientation);

  return (
    <div
      className={clsx(
        'flex h-full items-center justify-center gap-2',
        orientationClasses
      )}
    >
      <div className='flex flex-col items-center gap-1'>
        {/* Empty avatar circle with dashed border */}
        <div className='rounded-full border-2 border-dashed border-green-400/25 w-[28px] h-[28px] flex items-center justify-center bg-gray-800/30'>
          <span className='text-white text-lg font-bold'>+</span>
        </div>

        {/* Empty slot label */}
        <span className='text-xs text-white'>Empty</span>
      </div>
    </div>
  );
}
