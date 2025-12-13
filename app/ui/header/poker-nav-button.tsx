// app/ui/header/poker-nav-button.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import NavLinkCard from '@/app/ui/header/nav-link-card';

// Simple poker chip icon
function PokerChipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="6" fill="currentColor" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <circle cx="12" cy="20" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function PokerNavButton() {
  const { socket } = useSocket();
  const [humanPlayerCount, setHumanPlayerCount] = useState(0);

  // Fetch initial player count
  useEffect(() => {
    async function fetchPlayerCount() {
      try {
        const res = await fetch('/api/poker/singleton');
        if (res.ok) {
          const data = await res.json();
          if (data.game?.players) {
            const humanCount = data.game.players.filter((p: any) => !p.isAI).length;
            setHumanPlayerCount(humanCount);
          }
        }
      } catch (error) {
        console.error('[PokerNavButton] Failed to fetch player count:', error);
      }
    }

    fetchPlayerCount();
  }, []);

  // Listen for player count changes via socket
  useEffect(() => {
    if (!socket) return;

    const handlePlayerJoined = (payload: any) => {
      if (payload.players) {
        const humanCount = payload.players.filter((p: any) => !p.isAI).length;
        setHumanPlayerCount(humanCount);
      }
    };

    const handlePlayerLeft = (payload: any) => {
      if (payload.players) {
        const humanCount = payload.players.filter((p: any) => !p.isAI).length;
        setHumanPlayerCount(humanCount);
      }
    };

    const handleStateUpdate = (payload: any) => {
      if (payload.players) {
        const humanCount = payload.players.filter((p: any) => !p.isAI).length;
        setHumanPlayerCount(humanCount);
      }
    };

    socket.on(SOCKET_EVENTS.POKER_PLAYER_JOINED, handlePlayerJoined);
    socket.on(SOCKET_EVENTS.POKER_PLAYER_LEFT, handlePlayerLeft);
    socket.on(SOCKET_EVENTS.POKER_STATE_UPDATE, handleStateUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_PLAYER_JOINED, handlePlayerJoined);
      socket.off(SOCKET_EVENTS.POKER_PLAYER_LEFT, handlePlayerLeft);
      socket.off(SOCKET_EVENTS.POKER_STATE_UPDATE, handleStateUpdate);
    };
  }, [socket]);

  return (
    <NavLinkCard
      href="/games/poker"
      title="Poker"
      subtitle="Play Texas Hold'em"
      icon={<PokerChipIcon className="w-12 max-[375px]:w-5" />}
      badge={humanPlayerCount}
    />
  );
}
