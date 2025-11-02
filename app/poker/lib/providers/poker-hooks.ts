// app/lib/providers/poker/poker-hooks.ts

'use client';

import { useContext } from 'react';
import {
  GameStateContext,
  PotContext,
  PlayersContext,
  ViewersContext,
  ActionsContext,
  ProcessingContext,
} from './poker-contexts';

// ============= Hooks =============

export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a PokerProvider');
  }
  return context;
}

export function usePot() {
  const context = useContext(PotContext);
  if (!context) {
    throw new Error('usePot must be used within a PokerProvider');
  }
  return context;
}

export function usePlayers() {
  const context = useContext(PlayersContext);
  if (!context) {
    throw new Error('usePlayers must be used within a PokerProvider');
  }
  return context;
}

export function useViewers() {
  const context = useContext(ViewersContext);
  if (!context) {
    throw new Error('useViewers must be used within a PokerProvider');
  }
  return context;
}

export function usePokerActions() {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error('usePokerActions must be used within a PokerProvider');
  }
  return context;
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (!context) {
    throw new Error('useProcessing must be used within a PokerProvider');
  }
  return context;
}

// ============= Backward Compatibility Hook =============

export function usePoker() {
  const gameState = useGameState();
  const pot = usePot();
  const players = usePlayers();
  const viewers = useViewers();
  const actions = usePokerActions();
  const processing = useProcessing();

  return {
    ...gameState,
    ...pot,
    ...players,
    ...viewers,
    ...actions,
    ...processing,
  };
}
