// app/lib/server/poker/blinds-manager.ts

import type { Player } from '@/app/lib/definitions/poker';
import { createChips } from '@/app/lib/utils/poker';
import { ActionHistoryType } from '@/app/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { POKER_GAME_CONFIG } from '@/app/lib/config/poker-constants';

interface BlindConfig {
  smallBlind: number;
  bigBlind: number;
}

const DEFAULT_BLINDS: BlindConfig = {
  smallBlind: POKER_GAME_CONFIG.SMALL_BLIND,
  bigBlind: POKER_GAME_CONFIG.BIG_BLIND,
};

/**
 * Place small blind bet (Player 0)
 */
export function placeSmallBlind(game: any): {
  player: { username: string; id: string };
  amount: number;
} {
  if (game.players.length < 2) {
    throw new Error('Need at least 2 players to place blinds');
  }

  const { smallBlind } = DEFAULT_BLINDS;
  const smallBlindPlayer = game.players[0];

  // Validate player has enough chips for small blind
  if (!smallBlindPlayer.chips || smallBlindPlayer.chips.length < smallBlind) {
    throw new Error(`Player ${smallBlindPlayer.username} does not have enough chips for small blind (needs ${smallBlind}, has ${smallBlindPlayer.chips?.length || 0})`);
  }

  const smallBlindChips = smallBlindPlayer.chips.splice(0, smallBlind);
  game.pot.push({
    player: smallBlindPlayer.username,
    chips: smallBlindChips,
  });
  game.playerBets[0] = smallBlind;

  // Add action history for small blind
  game.actionHistory.push({
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: 0, // Preflop
    actionType: ActionHistoryType.PLAYER_BET,
    playerId: smallBlindPlayer.id,
    playerName: smallBlindPlayer.username,
    betAmount: smallBlind,
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
    amount: smallBlind,
  };
}

/**
 * Place big blind bet (Player 1)
 */
export function placeBigBlind(game: any): {
  player: { username: string; id: string };
  amount: number;
} {
  if (game.players.length < 2) {
    throw new Error('Need at least 2 players to place blinds');
  }

  const { bigBlind } = DEFAULT_BLINDS;
  const bigBlindPlayer = game.players[1];

  // Validate player has enough chips for big blind
  if (!bigBlindPlayer.chips || bigBlindPlayer.chips.length < bigBlind) {
    throw new Error(`Player ${bigBlindPlayer.username} does not have enough chips for big blind (needs ${bigBlind}, has ${bigBlindPlayer.chips?.length || 0})`);
  }

  const bigBlindChips = bigBlindPlayer.chips.splice(0, bigBlind);
  game.pot.push({
    player: bigBlindPlayer.username,
    chips: bigBlindChips,
  });
  game.playerBets[1] = bigBlind;

  // Add action history for big blind
  game.actionHistory.push({
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: 0, // Preflop
    actionType: ActionHistoryType.PLAYER_BET,
    playerId: bigBlindPlayer.id,
    playerName: bigBlindPlayer.username,
    betAmount: bigBlind,
    isBlind: true,
    blindType: 'big',
  });

  // Set current player to the one after big blind
  // If only 2 players, start with player 0 (small blind)
  // If 3+ players, start with player 2 (after big blind)
  game.currentPlayerIndex = game.players.length === 2 ? 0 : 2;

  // Mark modified for Mongoose
  game.markModified('players');
  game.markModified('pot');
  game.markModified('playerBets');
  game.markModified('currentPlayerIndex');
  game.markModified('actionHistory');

  return {
    player: bigBlindPlayer,
    amount: bigBlind,
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
export function placeAutomaticBlinds(game: any): {
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
