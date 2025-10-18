// app/holdem/definitions.ts

export enum GameStage {
    Cards = 0,
    Flop = 1,
    Turn = 2,
    River = 3,
}

export const STAGE_NAMES = ['Cards', 'Flop', 'Turn', 'River'] as const;

export interface Card {
    type: number;
    suit: 'hearts' | 'clubs' | 'diamonds' | 'spades';
    color: string;
    label: string;
    symbol: string;
}

export interface Chip {
    value: number;
}

export interface Player {
    id: number;
    name: string;
    hand: Card[];
    chips: Chip[];
    currentPlayer: boolean;
}

export interface Bet {
    player: string;
    chips: Chip[];
}
