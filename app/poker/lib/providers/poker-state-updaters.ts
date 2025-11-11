// app/lib/providers/poker/poker-state-updaters.ts

import type { Player, Card, Bet, GameStageProps } from '@/app/poker/lib/definitions/poker';
import type { PokerStateUpdatePayload } from '@/app/lib/socket/events';

// ============= State Updater Factory Functions =============

export interface StateSetters {
  setGameId: (id: string | null) => void;
  setPlayers: (players: Player[]) => void;
  setDeck: (deck: Card[]) => void;
  setCommunalCards: (cards: Card[]) => void;
  setPot: (pot: Bet[]) => void;
  setStage: (stage: number) => void;
  setLocked: (locked: boolean) => void;
  setCurrentPlayerIndex: (index: number) => void;
  setPlayerBets: (bets: number[]) => void;
  setGameStages: (stages: GameStageProps[]) => void;
  setWinner: (winner?: any) => void;
  setActionHistory: (history: any[]) => void;
  setActionTimer: (timer?: any) => void;
}

export const createResetGameState = (setters: StateSetters) => {
  return () => {
    setters.setGameId(null);
    setters.setPlayers([]);
    setters.setDeck([]);
    setters.setCommunalCards([]);
    setters.setPot([]);
    setters.setStage(0);
    setters.setLocked(false);
    setters.setCurrentPlayerIndex(0);
    setters.setPlayerBets([]);
    setters.setGameStages([]);
    setters.setWinner(undefined);
    setters.setActionHistory([]);
    setters.setActionTimer(undefined);
  };
};

export const createUpdateGameId = (setGameId: (id: string) => void) => {
  return (id: string) => {
    setGameId(id);
  };
};

export const createUpdatePlayers = (setPlayers: (players: Player[]) => void) => {
  return (newPlayers: Player[]) => {
    setPlayers(newPlayers);
  };
};

export const createUpdateBettingState = (
  setPot: (pot: Bet[]) => void,
  setPlayerBets: (bets: number[]) => void,
  setCurrentPlayerIndex: (index: number) => void
) => {
  return (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => {
    setPot(pot);
    setPlayerBets(playerBets);
    setCurrentPlayerIndex(currentPlayerIndex);
  };
};

export const createUpdateStageState = (
  setStage: (stage: number) => void,
  setCommunalCards: (cards: Card[]) => void,
  setDeck: (deck: Card[]) => void,
  setGameStages: (stages: GameStageProps[]) => void
) => {
  return (
    stage: number,
    communalCards: Card[],
    deck: Card[],
    stages?: GameStageProps[]
  ) => {
    setStage(stage);
    setCommunalCards(communalCards);
    setDeck(deck);
    if (stages) setGameStages(stages);
  };
};

export const createUpdateGameStatus = (
  setLocked: (locked: boolean) => void,
  setWinner: (winner?: any) => void
) => {
  return (
    locked: boolean,
    _lockTime?: string, // Ignored for backwards compatibility
    winner?: {
      winnerId: string;
      winnerName: string;
      handRank: string;
      isTie: boolean;
      tiedPlayers?: string[];
    }
  ) => {
    setLocked(locked);
    setWinner(winner); // Always update winner state, even when undefined to clear it
  };
};

export const createUpdateGameState = (
  updateGameId: (id: string) => void,
  updatePlayers: (players: Player[]) => void,
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void,
  updateStageState: (stage: number, communalCards: Card[], deck: Card[], stages?: GameStageProps[]) => void,
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void,
  setActionHistory: (history: any[]) => void,
  setActionTimer: (timer?: any) => void
) => {
  return (state: PokerStateUpdatePayload) => {
    // Extract game ID if present
    if (state._id) {
      updateGameId(state._id.toString());
    }
    updatePlayers(state.players);
    updateBettingState(state.pot, state.playerBets || [], state.currentPlayerIndex || 0);
    updateStageState(state.stage, state.communalCards, state.deck, (state as any).stages);
    updateGameStatus(state.locked, state.lockTime, state.winner);
    if ((state as any).actionHistory) {
      setActionHistory((state as any).actionHistory);
    }
    // Set action timer if present in state
    if ((state as any).actionTimer !== undefined) {
      setActionTimer((state as any).actionTimer);
    }
  };
};
