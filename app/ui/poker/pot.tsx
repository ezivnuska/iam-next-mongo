// app/ui/poker/pot.tsx

'use client';

import { memo } from 'react';
import { usePot } from '@/app/lib/providers/poker-provider';

function Pot() {
  const { potTotal, playerContributions } = usePot();

  if (potTotal === 0) return null;

  // Get sorted player contributions for consistent display
  const contributions = Object.entries(playerContributions).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div id="pot" className="flex flex-col border rounded px-3 py-2 gap-1 bg-gray-50">
      <div className="text-md font-bold">Pot: ${potTotal}</div>
      <div className="text-xs text-gray-600 border-t pt-1">
        {contributions.map(([username, amount]) => (
          <div key={username} className="flex justify-between gap-2">
            <span>{username}:</span>
            <span className="font-semibold">${amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(Pot);
