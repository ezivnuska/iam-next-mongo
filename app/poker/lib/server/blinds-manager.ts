// app/lib/server/poker/blinds-manager.ts

import type { Player } from '@/app/poker/lib/definitions/poker';
import type { PokerGameDocument } from '@/app/poker/lib/models/poker-game';
import { ActionHistoryType } from '@/app/poker/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { POKER_GAME_CONFIG } from '@/app/poker/lib/config/poker-constants';

interface BlindConfig {
  smallBlind: number;
  bigBlind: number;
}

const DEFAULT_BLINDS: BlindConfig = {
  smallBlind: POKER_GAME_CONFIG.SMALL_BLIND,
  bigBlind: POKER_GAME_CONFIG.BIG_BLIND,
};

/**
 * Calculate small blind position based on dealer button
 * - Heads-up (2 players): Button is small blind
 * - 3+ players: Player left of button is small blind
 */
function getSmallBlindPosition(buttonPosition: number, playerCount: number): number {
  if (playerCount === 2) {
    return buttonPosition; // In heads-up, button is small blind
  }
  return (buttonPosition + 1) % playerCount; // Left of button
}

/**
 * Place small blind bet
 */
export function placeSmallBlind(game: PokerGameDocument): {
  player: { username: string; id: string };
  amount: number;
  position: number;
} {
  if (game.players.length < 2) {
    throw new Error('Need at least 2 players to place blinds');
  }

  const { smallBlind } = DEFAULT_BLINDS;
  const smallBlindPosition = getSmallBlindPosition(game.dealerButtonPosition || 0, game.players.length);
  const smallBlindPlayer = game.players[smallBlindPosition];

  // Handle all-in if player doesn't have enough chips for small blind
  const availableChips = smallBlindPlayer.chipCount || 0;
  const blindAmount = Math.min(smallBlind, availableChips);
  const wentAllIn = availableChips > 0 && blindAmount === availableChips;

  if (availableChips === 0) {
    throw new Error(`Player ${smallBlindPlayer.username} has no chips to post small blind`);
  }

  // Deduct chips from player
  smallBlindPlayer.chipCount -= blindAmount;

  // Mark player as all-in if they bet all their chips
  if (wentAllIn) {
    smallBlindPlayer.isAllIn = true;
    smallBlindPlayer.allInAmount = blindAmount;
  }

  game.pot.push({
    player: smallBlindPlayer.username,
    chipCount: blindAmount,
  });
  game.playerBets[smallBlindPosition] = blindAmount;

  // Add action history for small blind
  game.actionHistory.push({
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: 0, // Preflop
    actionType: ActionHistoryType.PLAYER_BET,
    playerId: smallBlindPlayer.id,
    playerName: smallBlindPlayer.username,
    chipAmount: blindAmount,
    isBlind: true,
    blindType: 'small',
  });

  // Mark modified for Mongoose
  game.markModified('players');
  game.markModified('pot');
  game.markModified('playerBets');
  game.markModified('actionHistory');

  return {
    player: smallBlindPlayer,
    amount: blindAmount,
    position: smallBlindPosition,
  };
}

/**
 * Calculate big blind position based on dealer button
 * - Heads-up (2 players): Non-button player is big blind
 * - 3+ players: Player two left of button is big blind
 */
function getBigBlindPosition(buttonPosition: number, playerCount: number): number {
  if (playerCount === 2) {
    return (buttonPosition + 1) % playerCount; // Other player in heads-up
  }
  return (buttonPosition + 2) % playerCount; // Two left of button
}

/**
 * Place big blind bet
 */
export function placeBigBlind(game: PokerGameDocument): {
  player: { username: string; id: string };
  amount: number;
  position: number;
} {
  if (game.players.length < 2) {
    throw new Error('Need at least 2 players to place blinds');
  }

  const { bigBlind } = DEFAULT_BLINDS;
  const bigBlindPosition = getBigBlindPosition(game.dealerButtonPosition || 0, game.players.length);
  const bigBlindPlayer = game.players[bigBlindPosition];

  // Handle all-in if player doesn't have enough chips for big blind
  const availableChips = bigBlindPlayer.chipCount || 0;
  const blindAmount = Math.min(bigBlind, availableChips);
  const wentAllIn = availableChips > 0 && blindAmount === availableChips;

  if (availableChips === 0) {
    throw new Error(`Player ${bigBlindPlayer.username} has no chips to post big blind`);
  }

  // Deduct chips from player
  bigBlindPlayer.chipCount -= blindAmount;

  // Mark player as all-in if they bet all their chips
  if (wentAllIn) {
    bigBlindPlayer.isAllIn = true;
    bigBlindPlayer.allInAmount = blindAmount;
  }

  game.pot.push({
    player: bigBlindPlayer.username,
    chipCount: blindAmount,
  });
  game.playerBets[bigBlindPosition] = blindAmount;

  // Add action history for big blind
  game.actionHistory.push({
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: 0, // Preflop
    actionType: ActionHistoryType.PLAYER_BET,
    playerId: bigBlindPlayer.id,
    playerName: bigBlindPlayer.username,
    chipAmount: blindAmount,
    isBlind: true,
    blindType: 'big',
  });

  // Set current player to the one after big blind (preflop action)
  // In heads-up: Small blind (button) acts first preflop
  // In 3+ players: Player after big blind acts first
  const smallBlindPosition = getSmallBlindPosition(game.dealerButtonPosition || 0, game.players.length);

  let initialPosition: number;
  if (game.players.length === 2) {
    // Heads-up: Small blind acts first preflop
    initialPosition = smallBlindPosition;
  } else {
    // 3+ players: Player after big blind acts first
    initialPosition = (bigBlindPosition + 1) % game.players.length;
  }

  // Find first active player starting from initialPosition
  // Skip any players who went all-in during blind posting
  let currentIndex = initialPosition;
  let attempts = 0;

  while (attempts < game.players.length) {
    const candidate = game.players[currentIndex];
    if (!candidate.isAllIn && !candidate.folded) {
      break; // Found an active player
    }
    currentIndex = (currentIndex + 1) % game.players.length;
    attempts++;
  }

  game.currentPlayerIndex = currentIndex;

  // Mark modified for Mongoose
  game.markModified('players');
  game.markModified('pot');
  game.markModified('playerBets');
  game.markModified('currentPlayerIndex');
  game.markModified('actionHistory');

  return {
    player: bigBlindPlayer,
    amount: blindAmount,
    position: bigBlindPosition,
  };
}

/**
 * Place automatic blind bets when game starts
 * - Player 0: Small blind (1 chip)
 * - Player 1: Big blind (2 chips)
 *
 * Updates game state with blind bets and sets starting player
 * Returns info about blinds for notification purposes
 *
 * @deprecated Use placeSmallBlind and placeBigBlind separately for better timing control
 */
export function placeAutomaticBlinds(game: PokerGameDocument): {
  smallBlindPlayer: { username: string };
  bigBlindPlayer: { username: string };
  smallBlind: number;
  bigBlind: number;
} {
  const smallBlindInfo = placeSmallBlind(game);
  const bigBlindInfo = placeBigBlind(game);

  return {
    smallBlindPlayer: smallBlindInfo.player,
    bigBlindPlayer: bigBlindInfo.player,
    smallBlind: smallBlindInfo.amount,
    bigBlind: bigBlindInfo.amount,
  };
}

/**
 * Get the current blind configuration
 */
export function getBlindConfig(): BlindConfig {
  return { ...DEFAULT_BLINDS };
}
