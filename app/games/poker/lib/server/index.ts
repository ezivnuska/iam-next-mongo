// app/lib/server/poker/index.ts

/**
 * Poker Server Module - Barrel Export
 *
 * This module provides all poker game server-side functionality:
 *
 * - Dealer: Card/deck operations (dealing, shuffling, collection)
 * - Game Flow: Round progression, pot management, stage advancement
 * - Timer Management: Action timers, auto-bet, pause/resume
 * - Main Controller: All game actions and lifecycle management
 */

// Export dealer functions
export {
  initializeDeck,
  dealPlayerCards,
  dealCommunalCards,
  dealCommunalCardsByStage,
  collectAllCards,
  reshuffleAllCards,
  ensureCommunalCardsComplete,
} from './flow/poker-dealer';

// Export game flow functions
export {
  savePlayerBalances,
  awardPotToWinners,
  dealCommunalCardsForStage as dealCommunalCardsWithStageUpdate,
} from './flow/poker-game-flow';

// Export timer management functions
export {
  startActionTimer,
  clearActionTimer,
  pauseActionTimer,
  resumeActionTimer,
} from './timers/poker-timer-controller';

// Export main controller functions (re-exported for convenience)
export {
  getGame,
  getUserCurrentGame,
  createGame,
  addPlayer,
  removePlayer,
  placeBet,
  fold,
  deleteGame,
} from './actions/poker-game-controller';
