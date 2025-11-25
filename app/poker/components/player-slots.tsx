// app/poker/components/player-slots.tsx

'use client';

import { memo } from 'react';
import Player from './player';
import EmptyPlayerSlot from './empty-player-slot';
import type { Player as PlayerType, PlayerOrientation } from '@/app/poker/lib/definitions/poker';
import { useUser } from '@/app/lib/providers/user-provider';
import { useGameState } from '@/app/poker/lib/providers/poker-provider';
import { useScreenOrientation } from '@/app/poker/lib/hooks/use-screen-orientation';
import clsx from 'clsx';

/**
 * Slot configuration for strategic player positioning
 * Each slot has position classes and orientation for portrait and landscape modes
 */
interface SlotConfig {
  slotIndex: number;              // Clockwise position (0-4)

  // Portrait positioning
  portraitPosition: string;
  portraitOrientation: PlayerOrientation;

  // Landscape positioning
  landscapePosition: string;
  landscapeOrientation: PlayerOrientation;
}

/**
 * Strategic slot configurations for 5-player table layout
 * Positions start at bottom-left (slot 0) and go clockwise
 *
 * Landscape: Bottom-left → Top-left → Top-center → Top-right → Right-middle
 * Portrait: Bottom-left → Left-upper → Top-center → Right-upper → Bottom-right
 */
const SLOT_CONFIGS: SlotConfig[] = [
  // Slot 0: Bottom-left (START - Player 1)
  {
    slotIndex: 0,
    portraitPosition: 'top-[33%] left-[1%]',
    portraitOrientation: 'ltr',
    landscapePosition: 'top-[33%] left-[1%]',
    landscapeOrientation: 'ltr',
  },

  // Slot 1: Top-left (Player 2 - clockwise from slot 0)
  {
    slotIndex: 1,
    portraitPosition: 'top-[16%] left-[1%]',
    portraitOrientation: 'ltr',
    landscapePosition: 'top-[1%] left-[17%]',
    landscapeOrientation: 'ltr',
  },

  // Slot 2: Top-center (Player 3 - clockwise from slot 1)
  {
    slotIndex: 2,
    portraitPosition: 'top-[1%] left-1/2 -translate-x-1/2',
    portraitOrientation: 'ltr',
    landscapePosition: 'top-[1%] left-1/2 -translate-x-1/2',
    landscapeOrientation: 'ltr',
  },

  // Slot 3: Top-right (Player 4 - clockwise from slot 2)
  {
    slotIndex: 3,
    portraitPosition: 'top-[16%] right-[1%]',
    portraitOrientation: 'rtl',
    landscapePosition: 'top-[1%] right-[17%]',
    landscapeOrientation: 'rtl',
  },

  // Slot 4: Right side or Bottom-right (Player 5 - clockwise from slot 3)
  {
    slotIndex: 4,
    portraitPosition: 'top-[33%] right-[1%]',
    portraitOrientation: 'rtl',
    landscapePosition: 'top-[33%] right-[1%]',
    landscapeOrientation: 'rtl',
  },
];

interface PlayerSlotsProps {
  players: PlayerType[];
  locked: boolean;
  currentPlayerIndex: number;
  currentUserId?: string;
  gameId: string | null;
  onJoinGame: (gameId: string, guestUsername?: string) => void;
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
  const orientation = useScreenOrientation();

  // Calculate blind positions
  const { smallBlindPos, bigBlindPos } = getBlindPositions(dealerButtonPosition, players.length);

  // Create array of all 5 slots with players or placeholders
  // Players fill slots in clockwise order starting from slot 0
  const slots = SLOT_CONFIGS.map((slotConfig, slotIndex) => {
    const player = players[slotIndex]; // Players fill slots in order (0-4)

    if (!player) {
      // Empty slot - show placeholder
      return {
        type: 'empty' as const,
        slotIndex,
        slotConfig,
      };
    }

    return {
      type: 'player' as const,
      slotIndex,
      slotConfig,
      player,
      playerIndex: slotIndex,
    };
  });

  return (
    <ul className={clsx('flex h-full relative',
        {
            'mx-7': orientation === 'landscape',
        }
    )}>
      {slots.map((slot, index) => {
        // Select position based on current orientation
        const position = orientation === 'portrait'
          ? slot.slotConfig.portraitPosition
          : slot.slotConfig.landscapePosition;

        const playerOrientation = orientation === 'portrait'
          ? slot.slotConfig.portraitOrientation
          : slot.slotConfig.landscapeOrientation;

        if (slot.type === 'empty') {
          // Render empty slot placeholder
          return (
            <li
              key={`empty-${slot.slotIndex}`}
              className={clsx('absolute w-[120px] h-[96px] bg-green-400/25 rounded-xl p-1 border-2 border-dashed border-white/50', position)}
            >
              <EmptyPlayerSlot
                orientation={playerOrientation}
                gameId={gameId}
                isGameLocked={locked}
                onJoinGame={onJoinGame}
              />
            </li>
          );
        }

        // Render player
        const isCurrentUser = slot.player.id === currentUserId;
        const isDealer = slot.playerIndex === dealerButtonPosition;
        const isSmallBlind = slot.playerIndex === smallBlindPos;
        const isBigBlind = slot.playerIndex === bigBlindPos;

        return (
          <li
            key={slot.player.id}
            className={clsx('absolute w-[120px] h-[96px] bg-green-400/25 rounded-xl p-1 border-2 border-green-400/25', position, {
                'border-white': currentPlayerIndex === index,
            })}
          >
            <Player
              player={slot.player}
              index={slot.playerIndex}
              currentPlayerIndex={currentPlayerIndex}
              potContribution={0}
              isCurrentUser={isCurrentUser}
              isDealer={isDealer}
              isSmallBlind={isSmallBlind}
              isBigBlind={isBigBlind}
              mobileOrientation={playerOrientation}
              desktopOrientation={playerOrientation}
              actionTriggered={actionTriggered}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default memo(PlayerSlots);
