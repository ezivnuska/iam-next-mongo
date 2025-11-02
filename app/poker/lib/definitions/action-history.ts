// app/lib/definitions/action-history.ts

/**
 * Types of actions that can be logged in the game
 */
export enum ActionHistoryType {
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_BET = 'PLAYER_BET',
  PLAYER_FOLD = 'PLAYER_FOLD',
  CARDS_DEALT = 'CARDS_DEALT',
  STAGE_ADVANCED = 'STAGE_ADVANCED',
  GAME_STARTED = 'GAME_STARTED',
  GAME_ENDED = 'GAME_ENDED',
}

/**
 * Action history entry
 */
export interface GameActionHistory {
  id: string; // Unique identifier for this action
  timestamp: Date;
  stage: number; // 0=Preflop, 1=Flop, 2=Turn, 3=River, -1=Pre-game
  actionType: ActionHistoryType;

  // Player-related actions
  playerId?: string;
  playerName?: string;

  // Bet-specific data
  chipAmount?: number;

  // Card dealing data
  cardsDealt?: number; // Number of cards dealt (3 for flop, 1 for turn/river)

  // Stage transition data
  fromStage?: number;
  toStage?: number;

  // Winner data (for game ended)
  winnerId?: string;
  winnerName?: string;
}

/**
 * Serialized version for API/socket transmission
 */
export interface SerializedGameActionHistory extends Omit<GameActionHistory, 'timestamp'> {
  timestamp: string; // ISO string
}

/**
 * Actions grouped by stage for display
 */
export interface ActionsByStage {
  preGame: GameActionHistory[]; // stage = -1
  preflop: GameActionHistory[]; // stage = 0
  flop: GameActionHistory[]; // stage = 1
  turn: GameActionHistory[]; // stage = 2
  river: GameActionHistory[]; // stage = 3
}
