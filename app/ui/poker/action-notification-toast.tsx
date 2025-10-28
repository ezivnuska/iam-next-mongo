// app/ui/poker/action-notification-toast.tsx

'use client';

import { useProcessing, usePlayers } from '@/app/lib/providers/poker-provider';

export default function ActionNotificationToast() {
  const { pendingAction } = useProcessing();
  const { players } = usePlayers();

  // Don't render if no action is pending
  if (!pendingAction) return null;

  // Find the player performing the action
  const player = players.find(p => p.id === pendingAction.playerId);
  const playerName = player?.username || 'Unknown player';

  // Map action types to display text
  const actionText: Record<typeof pendingAction.type, string> = {
    bet: 'betting',
    call: 'calling',
    raise: 'raising',
    fold: 'folding',
  };

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        {/* Spinner */}
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        {/* Message */}
        <span className="font-medium">
          <span className="font-bold">{playerName}</span> is {actionText[pendingAction.type]}...
        </span>
      </div>
    </div>
  );
}
