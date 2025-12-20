// app/games/poker/lib/server/actions/poker-game-controller.ts
// Main poker game controller - re-exports from refactored modules for backward compatibility

// Game CRUD operations
export {
  getGame,
  getUserCurrentGame,
  createGame,
  deleteGame
} from './game-manager';

// Player management
export {
  addPlayer,
  removePlayer,
  handlePlayerJoin,
  handlePlayerLeave,
  setPlayerPresence,
  processQueuedPlayers
} from './player-manager';

// Bet actions
export {
  placeBet
} from './bet-handler';

// Fold actions
export {
  fold
} from './fold-handler';

// Timer functions (for backward compatibility)
export {
  startActionTimer,
  clearActionTimer,
  pauseActionTimer,
  resumeActionTimer,
  setTurnTimerAction
} from '../timers/poker-timer-controller';
