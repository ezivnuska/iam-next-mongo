// app/lib/definitions/game-actions.ts

export enum GameActionType {
  DEAL_CARDS = 'DEAL_CARDS',
  PLAYER_BET = 'PLAYER_BET',
  ADVANCE_STAGE = 'ADVANCE_STAGE',
}

export interface GameAction {
  type: GameActionType;
  playerId?: string; // For PLAYER_BET actions
  playerIndex?: number; // For PLAYER_BET actions
  timestamp: number;
}

export interface GameActionQueue {
  actions: GameAction[];
  currentIndex: number;
  isPaused: boolean;
  timerResetTrigger: number;
}
