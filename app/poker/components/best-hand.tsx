// app/ui/poker/best-hand.tsx

'use client';

import { useMemo } from 'react';
import { evaluateHand } from '@/app/poker/lib/utils/poker';
import type { Player, Card } from '@/app/poker/lib/definitions/poker';

interface BestHandProps {
  players: Player[];
  communalCards: Card[];
  locked: boolean;
}

export default function BestHand({ players, communalCards, locked }: BestHandProps) {
  const bestHandInfo = useMemo(() => {
    if (!locked || players.length === 0 || communalCards.length === 0) return null;

    // Evaluate all players' hands
    const evaluations = players
      .filter(p => p.hand && p.hand.length > 0)
      .map(player => ({
        player,
        evaluation: evaluateHand([...player.hand, ...communalCards])
      }));

    if (evaluations.length === 0) return null;

    // Find the best hand
    let best = evaluations[0];
    for (let i = 1; i < evaluations.length; i++) {
      const current = evaluations[i];
      // Compare ranks
      if (current.evaluation.rank > best.evaluation.rank) {
        best = current;
      } else if (current.evaluation.rank === best.evaluation.rank) {
        // Same rank, compare values
        for (let j = 0; j < Math.min(current.evaluation.values.length, best.evaluation.values.length); j++) {
          if (current.evaluation.values[j] > best.evaluation.values[j]) {
            best = current;
            break;
          } else if (current.evaluation.values[j] < best.evaluation.values[j]) {
            break;
          }
        }
      }
    }

    return {
      playerName: best.player.username,
      handRank: best.evaluation.rankName
    };
  }, [players, communalCards, locked]);

  if (!bestHandInfo) return null;

  return (
    <div id="best-hand" className="flex flex-row items-center justify-end gap-4 bg-blue-100 rounded px-2 py-1">
        <span className="text-md font-bold">{bestHandInfo.playerName}</span>
        <span className="text-md">{bestHandInfo.handRank}</span>
    </div>
  );
}
