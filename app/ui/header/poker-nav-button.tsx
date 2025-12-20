// app/ui/header/poker-nav-button.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import NavLinkCard from '@/app/ui/header/nav-link-card';
import PokerChipIcon from '@/app/ui/icons/poker-chip-icon';

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
