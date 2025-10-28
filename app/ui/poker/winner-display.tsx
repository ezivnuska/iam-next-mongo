// app/ui/poker/winner-display.tsx

'use client';

import { useGameState } from "@/app/lib/providers/poker-provider";

export default function WinnerDisplay() {
  const { winner } = useGameState();
  return (
    <div id="winner" className="flex flex-1 px-4 py-2 bg-green-100 border-2 border-green-500 rounded-xl">
      {winner?.isTie ? (
        <div>
          <h3 className="text-xl font-bold">It&apos;s a Tie!</h3>
          <p>Players: {winner.tiedPlayers?.join(', ')}</p>
          <p>Hand: {winner.handRank}</p>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-bold">{winner?.winnerName} Wins with a {winner?.handRank}!</h3>
        </div>
      )}
    </div>
  );
}
