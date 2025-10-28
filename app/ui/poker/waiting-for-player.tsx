// app/ui/poker/waiting-for-player.tsx

'use client';

interface WaitingForPlayerProps {
  playerName: string;
}

export default function WaitingForPlayer({ playerName }: WaitingForPlayerProps) {
  return (
    <div
      className="flex items-center justify-center p-4 bg-gray-800 text-white rounded-lg"
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">
        Waiting for <span className="font-bold">{playerName}</span>...
      </span>
    </div>
  );
}
