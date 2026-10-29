// app/lib/utils/game-serialization.ts

import type { PokerGameDocument, Card, Bet, GameStageProps, WinnerInfo, SerializedActionTimer, Player } from '@/app/games/poker/lib/definitions/poker';
import type { SerializedGameActionHistory } from '@/app/games/poker/lib/definitions/action-history';

export interface SerializedGame {
  _id: string;
  code: string;
  players: Player[];
  deck: Card[];
  communalCards: Card[];
  pot: Bet[];
  stage: number;
  locked: boolean;
  lockTime?: string;
  currentPlayerIndex: number;
  dealerButtonPosition?: number;
  currentBet: number;
  playerBets: number[];
  stages: GameStageProps[];
  actionHistory: SerializedGameActionHistory[];
  winner?: WinnerInfo;
  actionTimer?: SerializedActionTimer;
  createdAt: string;
  updatedAt: string;
}

type RawGame = PokerGameDocument & { toObject?: () => Record<string, unknown> };

export function serializeGame(game: RawGame): SerializedGame {
  const obj: Record<string, unknown> = typeof game.toObject === 'function'
    ? game.toObject()
    : (game as unknown as Record<string, unknown>);

  return {
    ...obj,
    _id: (obj._id as { toString(): string }).toString(),
    lockTime: obj.lockTime ? (obj.lockTime as Date).toISOString() : undefined,
    createdAt: (obj.createdAt as Date)?.toISOString?.() ?? (obj.createdAt as string),
    updatedAt: (obj.updatedAt as Date)?.toISOString?.() ?? (obj.updatedAt as string),
    actionHistory: ((obj.actionHistory as Array<{ timestamp?: Date } & Record<string, unknown>>) ?? []).map((action) => ({
      ...action,
      timestamp: action.timestamp?.toISOString?.() ?? action.timestamp,
    })),
    actionTimer: obj.actionTimer
      ? {
          ...(obj.actionTimer as Record<string, unknown>),
          startTime: (obj.actionTimer as { startTime?: Date }).startTime?.toISOString?.()
            ?? (obj.actionTimer as { startTime?: string }).startTime,
        }
      : undefined,
  } as SerializedGame;
}

export function serializeGames(games: RawGame[]): SerializedGame[] {
  return games.map(serializeGame);
}
