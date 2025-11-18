// app/ui/poker/pot.tsx

'use client';

import { memo, useMemo } from 'react';
import { usePot, usePlayers, useGameState } from '@/app/poker/lib/providers/poker-provider';
import { calculateSidePots } from '@/app/poker/lib/utils/side-pot-calculator';

function Pot() {
  const { potTotal, playerContributions } = usePot();
  const { players } = usePlayers();
  const { playerBets, locked } = useGameState();

  // Calculate side pots if there are any all-in players
  const sidePots = useMemo(() => {
    if (!locked || players.length === 0) return null;

    const hasAllIn = players.some(p => p.isAllIn);
    if (!hasAllIn) return null;

    return calculateSidePots(players, playerBets);
  }, [players, playerBets, locked]);

  if (potTotal === 0) return null;

  // If there are side pots, display them separately
  if (sidePots && sidePots.length > 1) {
    return (
      <div id="pot" className="flex flex-col rounded-xl px-3 py-2 gap-2 border-1 border-green-400">
        <div className="text-xs text-gray-300 font-semibold">POTS</div>
        {sidePots.map((pot, index) => (
          <div key={index} className="flex flex-col gap-0.5">
            <div className="text-xs text-gray-400">
              {index === 0 ? 'Main' : `Side ${index}`}
            </div>
            <div className="text-lg font-bold text-white">${pot.amount}</div>
          </div>
        ))}
        <div className="text-xs text-gray-400 border-t border-gray-600 pt-1">
          Total: ${potTotal}
        </div>
      </div>
    );
  }

  // Default single pot display
  return (
    <div id="pot" className="inline-block rounded-xl px-3 py-2 border-1 border-green-400 bg-red-600">
      <p className="text-xl font-bold text-white">${potTotal}</p>
    </div>
  );
}

export default memo(Pot);
