// app/lib/utils/game-serialization.ts

import type { PokerGameDocument } from '@/app/poker/lib/models/poker-game';
import type { SerializedGameActionHistory } from '@/app/poker/lib/definitions/action-history';

/**
 * Serialized game state for API responses
 */
export interface SerializedGame {
  _id: string;
  code: string;
  players: any[];
  deck: any[];
  communalCards: any[];
  pot: any[];
  stage: number;
  locked: boolean;
  lockTime?: string;
  currentPlayerIndex: number;
  currentBet: number;
  playerBets: number[];
  stages: any[];
  actionHistory: SerializedGameActionHistory[];
  winner?: any;
  actionTimer?: any;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert a Mongoose game document to a serialized format safe for API responses
 *
 * @param game - The game document or plain object
 * @returns Serialized game object with converted dates and IDs
 */
export function serializeGame(game: PokerGameDocument | any): SerializedGame {
  const obj = typeof game.toObject === 'function' ? game.toObject() : game;

  return {
    ...obj,
    _id: obj._id.toString(),
    lockTime: obj.lockTime ? obj.lockTime.toISOString() : undefined,
    createdAt: obj.createdAt?.toISOString?.() || obj.createdAt,
    updatedAt: obj.updatedAt?.toISOString?.() || obj.updatedAt,
    actionHistory: obj.actionHistory?.map((action: any) => ({
      ...action,
      timestamp: action.timestamp?.toISOString?.() || action.timestamp,
    })) || [],
    actionTimer: obj.actionTimer
      ? {
          ...obj.actionTimer,
          startTime: obj.actionTimer.startTime?.toISOString?.() || obj.actionTimer.startTime,
        }
      : undefined,
  };
}

/**
 * Serialize multiple games
 *
 * @param games - Array of game documents
 * @returns Array of serialized games
 */
export function serializeGames(games: (PokerGameDocument | any)[]): SerializedGame[] {
  return games.map(serializeGame);
}
