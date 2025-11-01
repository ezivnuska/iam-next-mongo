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
 * Place automatic blind bets when game starts
 * - Player 0: Small blind (1 chip)
 * - Player 1: Big blind (2 chips)
 *
 * Updates game state with blind bets and sets starting player
 * Returns info about blinds for notification purposes
 */
export function placeAutomaticBlinds(game: any): {
  smallBlindPlayer: { username: string };
  bigBlindPlayer: { username: string };
  smallBlind: number;
  bigBlind: number;
} {
  if (game.players.length < 2) {
    throw new Error('Need at least 2 players to place blinds');
  }

  const { smallBlind, bigBlind } = DEFAULT_BLINDS;

  // Player 0 - Small blind
  const smallBlindPlayer = game.players[0];
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

  // Player 1 - Big blind
  const bigBlindPlayer = game.players[1];
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
    smallBlindPlayer,
    bigBlindPlayer,
    smallBlind,
    bigBlind,
  };
}

/**
 * Get the current blind configuration
 */
export function getBlindConfig(): BlindConfig {
  return { ...DEFAULT_BLINDS };
}
