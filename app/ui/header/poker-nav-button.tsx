// app/ui/header/poker-nav-button.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';

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
  const pathname = usePathname();
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
    <Link
      href="/poker"
      className={clsx(
        'relative flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium m-1 py-1 px-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:px-3',
        {
          'bg-sky-100 text-blue-600': pathname === '/poker',
        },
      )}
    >
      <PokerChipIcon className="w-6 max-[375px]:w-5 self-center" />
      <p className="text-xs hidden md:block">Poker</p>

      {/* Player count badge */}
      {humanPlayerCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
          {humanPlayerCount}
        </span>
      )}
    </Link>
  );
}
