// app/lib/providers/poker/index.ts

/**
 * Poker Provider Module
 *
 * This module exports all poker-related functionality in a modular structure:
 *
 * - poker-contexts.tsx: Context definitions and TypeScript interfaces
 * - poker-hooks.ts: Custom hooks for consuming contexts
 * - poker-state-updaters.ts: State management helper functions
 * - poker-socket-handlers.ts: Socket event handler factories
 * - poker-api-actions.ts: API action creator functions
 *
 * Main provider is exported from ../poker-provider.tsx
 */

// Export context types
export type {
  GameStateContextValue,
  PlayersContextValue,
  ViewersContextValue,
  ActionsContextValue,
} from './poker-contexts';

// Export contexts (if needed for advanced use cases)
export {
  GameStateContext,
  PlayersContext,
  ViewersContext,
  ActionsContext,
} from './poker-contexts';

// Export hooks
export {
  useGameState,
  usePlayers,
  useViewers,
  usePokerActions,
  usePoker,
} from './poker-hooks';

// Export custom hooks
export { useAutoRestart } from './use-auto-restart';
export { usePokerSocketEffects } from './use-poker-socket-effects';
export type { PokerSocketEffectsDeps } from './use-poker-socket-effects';

// Export state updater types and factories
export type { StateSetters } from './poker-state-updaters';
export {
  createResetGameState,
  createUpdateGameId,
  createUpdatePlayers,
  createUpdateBettingState,
  createUpdateStageState,
  createUpdateGameStatus,
  createUpdateGameState,
} from './poker-state-updaters';

// Export socket handler types and factories
export type { GameStateSnapshot, StateUpdaters, SocketHandlerDeps } from './poker-socket-handlers';
export {
  createStateUpdateHandler,
  createGameCreatedHandler,
  createGameDeletedHandler,
  createBetPlacedHandler,
  createCardsDealtHandler,
  createRoundCompleteHandler,
  createTimerStartedHandler,
  createTimerPausedHandler,
  createTimerResumedHandler,
  createTimerClearedHandler,
  registerSocketHandlers,
} from './poker-socket-handlers';

// Export API action factories
export {
  fetchCurrentGame,
  createJoinGameAction,
  createPlaceBetAction,
  createFoldAction,
  createLeaveGameAction,
  createDeleteGameAction,
  createPauseTimerAction,
  createResumeTimerAction,
  initializeGames,
} from './poker-api-actions';
