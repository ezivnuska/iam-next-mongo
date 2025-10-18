// app/lib/utils/poker.ts

import type { Card, Suit, Chip } from '@/app/lib/definitions/poker';

export const SUITS: Suit[] = ['hearts', 'clubs', 'diamonds', 'spades'];

export function createCard(type: number, suit: Suit): Card {
  let label: string;
  let color: string;
  let symbol: string;

  // Set label
  switch (type) {
    case 11:
      label = 'J';
      break;
    case 12:
      label = 'Q';
      break;
    case 13:
      label = 'K';
      break;
    case 1:
      label = 'A';
      break;
    default:
      label = type.toString();
  }

  // Set color
  switch (suit) {
    case 'diamonds':
    case 'hearts':
      color = '#f00';
      break;
    default:
      color = '#000';
  }

  // Set symbol
  switch (suit) {
    case 'spades':
      symbol = '♠';
      break;
    case 'diamonds':
      symbol = '♦';
      break;
    case 'hearts':
      symbol = '♥';
      break;
    case 'clubs':
      symbol = '♣';
      break;
  }

  return {
    id: `${type}-${suit}`,
    type,
    suit,
    label,
    color,
    symbol,
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (let type = 1; type <= 13; type++) {
      deck.push(createCard(type, suit));
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createChips(count: number, value: number = 10): Chip[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `chip-${i}-${Date.now()}`,
    value,
  }));
}

export function getChipTotal(chips: Chip[]): number {
  return chips.reduce((total, chip) => total + chip.value, 0);
}

export function getPotTotal(bets: { chips: Chip[] }[]): number {
  return bets.reduce((total, bet) => {
    return total + getChipTotal(bet.chips);
  }, 0);
}
