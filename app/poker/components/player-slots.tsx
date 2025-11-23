// app/ui/poker/player-slots.tsx

'use client';

import { memo } from 'react';
import Player from './player';
import { Button } from '@/app/ui/button';
import type { Player as PlayerType, PlayerOrientation } from '@/app/poker/lib/definitions/poker';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import { useGameState } from '@/app/poker/lib/providers/poker-provider';
import clsx from 'clsx';

/**
 * Slot configuration for strategic player positioning
 * Each slot has position classes and orientation for mobile and desktop
 */
interface SlotConfig {
  position: string;  // Tailwind classes for positioning (responsive)
  mobileOrientation: PlayerOrientation;
  desktopOrientation: PlayerOrientation;
}

/**
 * Strategic slot configurations for 5-player table layout
 * Positions create a circular arrangement around the table
 * Orientations ensure players face toward the table center
 */
const SLOT_CONFIGS: SlotConfig[] = [
  // Slot 0: Bottom-left (typical "hero" position for current user)
  {
    position: 'bottom-[5%] left-[5%] sm:bottom-[10%] sm:left-[5%]',
    mobileOrientation: 'ltr',
    desktopOrientation: 'ltr',
  },
  // Slot 1: Left side
  {
    position: 'top-[25%] left-[2%] sm:top-[30%] sm:left-[2%]',
    mobileOrientation: 'ltr',
    desktopOrientation: 'ltr',
  },
  // Slot 2: Top-left
  {
    position: 'top-[5%] left-[9%] sm:top-[5%] sm:left-[25%]',
    mobileOrientation: 'ltr',
    desktopOrientation: 'ltr',
  },
  // Slot 3: Top-right
  {
    position: 'top-[5%] right-[9%] sm:top-[5%] sm:right-[25%]',
    mobileOrientation: 'rtl',
    desktopOrientation: 'rtl',
  },
  // Slot 4: Right side
  {
    position: 'top-[25%] right-[2%] sm:top-[30%] sm:right-[2%]',
    mobileOrientation: 'rtl',
    desktopOrientation: 'rtl',
  },
];

/**
 * Calculate which slot a player should occupy based on player count
 * - 5 players: First player starts at slot 0
 * - 4 players: First player starts at slot 1
 * - 3 players: First player starts at slot 1
 * - 2 players: First player starts at slot 2
 * - 1 player: First player starts at slot 2
 */
function getSlotIndexForPlayer(playerIndex: number, playerCount: number): number {
  let startSlot: number;

  if (playerCount === 5) {
    startSlot = 0;
  } else if (playerCount >= 3) {
    startSlot = 1;
  } else {
    startSlot = 2;
  }

  return (startSlot + playerIndex) % 5;
}

interface PlayerSlotsProps {
  players: PlayerType[];
  locked: boolean;
  currentPlayerIndex: number;
  currentUserId?: string;
  gameId: string | null;
  onJoinGame: () => void;
  onLeaveGame: () => void;
  actionTriggered: boolean;
}

/**
 * Calculate blind positions based on dealer button
 */
function getBlindPositions(dealerButtonPosition: number, playerCount: number) {
  if (playerCount < 2) {
    return { smallBlindPos: -1, bigBlindPos: -1 };
  }

  const smallBlindPos = playerCount === 2
    ? dealerButtonPosition
    : (dealerButtonPosition + 1) % playerCount;

  const bigBlindPos = playerCount === 2
    ? (dealerButtonPosition + 1) % playerCount
    : (dealerButtonPosition + 2) % playerCount;

  return { smallBlindPos, bigBlindPos };
}

function PlayerSlots({ players, locked, currentPlayerIndex, currentUserId, gameId, onJoinGame, onLeaveGame, actionTriggered }: PlayerSlotsProps) {
  const MAX_SLOTS = 5;

  const { user } = useUser();
  const { dealerButtonPosition } = useGameState();
  const isUserInGame = players.some(p => p.id === currentUserId);

  // Calculate blind positions
  const { smallBlindPos, bigBlindPos } = getBlindPositions(dealerButtonPosition, players.length);

  // Check if there are any human players
  const humanPlayers = players.filter(p => !p.isAI);
  const hasHumanPlayers = humanPlayers.length > 0;
  const aiPlayer = players.find(p => p.isAI);

  // Show button if user is not in game, game is not locked (in progress), and table is not full
  const canJoin = !isUserInGame && !locked && players.length < MAX_SLOTS;

  return (
    <ul className='flex h-full w-full relative'>
      {players.map((player, playerIndex) => {
        const slotIndex = getSlotIndexForPlayer(playerIndex, players.length);
        const slotConfig = SLOT_CONFIGS[slotIndex];
        
        if (!slotConfig) return null;

        const isCurrentUser = player.id === currentUserId;

        // Determine if this player has the dealer button
        const isDealer = playerIndex === dealerButtonPosition;

        // Determine if this player has the small or big blind
        const isSmallBlind = playerIndex === smallBlindPos;
        const isBigBlind = playerIndex === bigBlindPos;

        return (
          <li key={player.id} className={clsx(
              'absolute',
              slotConfig.position,
          )}>
            <Player
              player={player}
              index={playerIndex}
              currentPlayerIndex={currentPlayerIndex}
              potContribution={0}
              isCurrentUser={isCurrentUser}
              isDealer={isDealer}
              isSmallBlind={isSmallBlind}
              isBigBlind={isBigBlind}
              mobileOrientation={slotConfig.mobileOrientation}
              desktopOrientation={slotConfig.desktopOrientation}
              actionTriggered={actionTriggered}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default memo(PlayerSlots);
