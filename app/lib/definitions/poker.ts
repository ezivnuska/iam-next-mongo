// app/lib/definitions/poker.ts

export type Suit = 'hearts' | 'clubs' | 'diamonds' | 'spades';

export interface Card {
  id: string;
  type: number;
  suit: Suit;
  color: string;
  label: string;
  symbol: string;
}

export interface Chip {
  id: string;
  value: number;
}

export interface Bet {
  player: string;
  chips: Chip[];
}

export interface Player {
  id: string;
  username: string;
  hand: Card[];
  chips: Chip[];
}

export enum GameStage {
    Cards = 0,
    Flop = 1,
    Turn = 2,
    River = 3,
}

export interface GameState {
  players: Player[];
  deck: Card[];
  communalCards: Card[];
  pot: Bet[];
  stage: number;
  stages: GameStage[];
  playing: boolean;
  playerBets: number[];
}
