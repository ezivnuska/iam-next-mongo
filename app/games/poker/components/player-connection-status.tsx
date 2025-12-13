// app/poker/components/player-connection-status.tsx

'use client';

import { useState, useEffect } from 'react';

interface PlayerConnectionStatusProps {
  playerId: string;
  lastHeartbeat?: Date | string;
  isCurrentPlayer?: boolean;
}

/**
 * Displays connection status indicator for a player
 *
 * Shows:
 * - Green dot: Connected (heartbeat within 15s)
 * - Yellow dot: Reconnecting (heartbeat 15-30s ago)
 * - Red dot: Disconnected (heartbeat >30s ago)
 * - Gray dot: Unknown (no heartbeat data)
 */
export default function PlayerConnectionStatus({
  playerId,
  lastHeartbeat,
  isCurrentPlayer = false,
}: PlayerConnectionStatusProps) {
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'disconnected' | 'unknown'>('unknown');

  useEffect(() => {
    if (!lastHeartbeat) {
      setStatus('unknown');
      return;
    }

    const checkStatus = () => {
      const heartbeatTime = typeof lastHeartbeat === 'string'
        ? new Date(lastHeartbeat).getTime()
        : lastHeartbeat.getTime();

      const timeSinceHeartbeat = Date.now() - heartbeatTime;

      if (timeSinceHeartbeat < 15000) {
        // Within 15 seconds - connected
        setStatus('connected');
      } else if (timeSinceHeartbeat < 30000) {
        // 15-30 seconds - reconnecting
        setStatus('reconnecting');
      } else {
        // Over 30 seconds - disconnected
        setStatus('disconnected');
      }
    };

    // Check immediately
    checkStatus();

    // Update every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [lastHeartbeat]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'reconnecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return '';
    }
  };

  // Only show indicator for current player or when status is not connected
  const shouldShow = isCurrentPlayer || status !== 'connected';

  if (!shouldShow) return null;

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${getStatusColor()}`}
        title={getStatusText()}
      />
      {isCurrentPlayer && status !== 'connected' && (
        <span className="text-xs text-gray-600">
          {getStatusText()}
        </span>
      )}
    </div>
  );
}
