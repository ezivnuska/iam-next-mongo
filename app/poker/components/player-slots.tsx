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
 * Get dealer button position classes based on slot index
 * Positions the button toward the center of the screen relative to the player slot
 */
function getDealerButtonPositionClasses(slotIndex: number, orientation: 'portrait' | 'landscape'): string {
  // Map slot index to button position (toward center)
  const positions = {
    portrait: [
      'top-1/2 -right-5 translate-x-1/2 -translate-y-1/2',  // Slot 0 (bottom-left): button to the right (toward center)
      'bottom-1 -right-3 translate-x-1/2 translate-y-1/2',  // Slot 1 (left-upper): button to bottom-right (toward center)
      '-bottom-5 left-1/2 -translate-x-1/2 translate-y-1/2', // Slot 2 (top-center): button below (toward center)
      'bottom-1 -left-3 -translate-x-1/2 translate-y-1/2',  // Slot 3 (right-upper): button to bottom-left (toward center)
      'top-1/2 -left-5 -translate-x-1/2 -translate-y-1/2',  // Slot 4 (bottom-right): button to the left (toward center)
    ],
    landscape: [
      'top-3/5 -right-5 translate-x-1/2 -translate-y-1/2',    // Slot 0 (bottom-left): button to top-right (toward center)
      '-bottom-3 right-5 translate-x-1/2 translate-y-1/2',  // Slot 1 (top-left): button to bottom-right (toward center)
      '-bottom-5 left-1/2 -translate-x-1/2 translate-y-1/2', // Slot 2 (top-center): button below (toward center)
      '-bottom-3 left-5 -translate-x-1/2 translate-y-1/2',  // Slot 3 (top-right): button to bottom-left (toward center)
      'top-3/5 -left-5 -translate-x-1/2 -translate-y-1/2',    // Slot 4 (right-middle): button to top-left (toward center)
    ],
  };

  return positions[orientation][slotIndex] || '';
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
    portraitPosition: 'bottom-0 left-[1%]',
    portraitOrientation: 'ltr',
    landscapePosition: 'bottom-[2%] left-0',
    landscapeOrientation: 'ltr',
  },

  // Slot 1: Top-left (Player 2 - clockwise from slot 0)
  {
    slotIndex: 1,
    portraitPosition: 'top-[17%] left-[2%]',
    portraitOrientation: 'ltr',
    landscapePosition: 'top-[8%] left-[18%]',
    landscapeOrientation: 'ltr',
  },

  // Slot 2: Top-center (Player 3 - clockwise from slot 1)
  {
    slotIndex: 2,
    portraitPosition: 'top-[2%] left-1/2 -translate-x-1/2',
    portraitOrientation: 'ltr',
    landscapePosition: 'top-[2%] left-1/2 -translate-x-1/2',
    landscapeOrientation: 'ltr',
  },

  // Slot 3: Top-right (Player 4 - clockwise from slot 2)
  {
    slotIndex: 3,
    portraitPosition: 'top-[17%] right-[2%]',
    portraitOrientation: 'rtl',
    landscapePosition: 'top-[8%] right-[18%]',
    landscapeOrientation: 'rtl',
  },

  // Slot 4: Right side or Bottom-right (Player 5 - clockwise from slot 3)
  {
    slotIndex: 4,
    portraitPosition: 'bottom-0 right-[1%]',
    portraitOrientation: 'rtl',
    landscapePosition: 'bottom-[2%] right-0',
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
  const { dealerButtonPosition, winner } = useGameState();
  const orientation = useScreenOrientation();

  // Calculate blind positions
  const { smallBlindPos, bigBlindPos } = getBlindPositions(dealerButtonPosition, players.length);

  // Track if we've encountered the first empty slot
  let firstEmptySlotFound = false;

  // Create array of all 5 slots with players or placeholders
  // Players fill slots in clockwise order starting from slot 0
  const slots = SLOT_CONFIGS.map((slotConfig, slotIndex) => {
    const player = players[slotIndex]; // Players fill slots in order (0-4)

    if (!player) {
      // Empty slot - show placeholder
      const isFirstEmpty = !firstEmptySlotFound;
      firstEmptySlotFound = true;

      return {
        type: 'empty' as const,
        slotIndex,
        slotConfig,
        isFirstEmpty,
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
    <ul className='flex flex-1 relative'>
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
              className={clsx('absolute w-[120px] h-[96px] bg-green-400/25 border-2 border-dashed border-yellow-300/50 rounded-full', position)}
            >
              <EmptyPlayerSlot
                orientation={playerOrientation}
                gameId={gameId}
                isGameLocked={locked}
                onJoinGame={onJoinGame}
                isClickable={slot.isFirstEmpty}
              />
            </li>
          );
        }

        // Render player
        const isCurrentUser = slot.player.id === currentUserId;
        const isDealer = slot.playerIndex === dealerButtonPosition;
        const isSmallBlind = slot.playerIndex === smallBlindPos;
        const isBigBlind = slot.playerIndex === bigBlindPos;
        const dealerButtonClasses = getDealerButtonPositionClasses(slot.slotIndex, orientation);

        return (
          <li
            key={slot.player.id}
            // className={clsx('absolute w-[120px] h-[96px] bg-green-400/25 rounded-xl p-1 border-2 border-green-400/25 overflow-hidden', position, {
            className={clsx('absolute w-[120px] h-[96px] bg-green-400/25 border-2 border-dashed border-yellow-300 rounded-full', position, {
                'border-white': currentPlayerIndex === index && !slot.player.folded,
            })}
          >
            <Player
              player={slot.player}
              index={slot.playerIndex}
              currentPlayerIndex={currentPlayerIndex}
              potContribution={0}
              isCurrentUser={isCurrentUser}
              isSmallBlind={isSmallBlind}
              isBigBlind={isBigBlind}
              mobileOrientation={playerOrientation}
              desktopOrientation={playerOrientation}
              actionTriggered={actionTriggered}
            />
            {isDealer && locked && !winner && (
              <div className={`absolute z-20 ${dealerButtonClasses}`}>
                <div className='flex flex-row items-center justify-center h-5 w-5 rounded-full bg-yellow-500 text-black overflow-hidden border-1'>
                  <span className='text-xs font-bold text-black'>
                    D
                  </span>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default memo(PlayerSlots);
