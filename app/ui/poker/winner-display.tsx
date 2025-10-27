// app/ui/poker/winner-display.tsx

'use client';

interface WinnerDisplayProps {
  winner: {
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  };
}

export default function WinnerDisplay({
  winner,
}: WinnerDisplayProps) {
  return (
    <div id="winner" className="flex-1 p-4 bg-green-100 border-2 border-green-500 rounded">
      {winner.isTie ? (
        <div>
          <h3 className="text-xl font-bold">It&apos;s a Tie!</h3>
          <p>Players: {winner.tiedPlayers?.join(', ')}</p>
          <p>Hand: {winner.handRank}</p>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-bold">{winner.winnerName} Wins with a {winner.handRank}!</h3>
        </div>
      )}
    </div>
  );
}
