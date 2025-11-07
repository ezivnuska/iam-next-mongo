// app/lib/utils/poker.ts

import type { Card, Suit, Chip } from '@/app/poker/lib/definitions/poker';

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

/**
 * @deprecated Chips are now represented as simple numbers.
 * Use the chip count directly instead of calling this function.
 * This function is kept for backward compatibility and simply returns the count.
 */
export function createChips(count: number, value: number = 1): number {
  return count * value;
}

/**
 * @deprecated Chips are now represented as simple numbers.
 * This function is kept for backward compatibility and returns the value as-is.
 */
export function getChipTotal(chipCount: number | Chip[]): number {
  // Handle both old (array) and new (number) formats for backward compatibility
  if (typeof chipCount === 'number') {
    return chipCount;
  }
  // Legacy support for Chip arrays
  return chipCount.reduce((total, chip) => total + chip.value, 0);
}

export function getPotTotal(bets: { chipCount: number }[]): number {
  return bets.reduce((total, bet) => total + bet.chipCount, 0);
}

// Hand evaluation types
export enum HandRank {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export interface HandEvaluation {
  rank: HandRank;
  rankName: string;
  values: number[]; // For comparing hands of same rank
  cards: Card[];
}

// Evaluate a poker hand (5-7 cards)
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    return {
      rank: HandRank.HighCard,
      rankName: 'High Card',
      values: [],
      cards: [],
    };
  }

  // Get all possible 5-card combinations
  const combinations = getAllCombinations(cards, 5);
  let bestHand: HandEvaluation | null = null;

  for (const combo of combinations) {
    const evaluation = evaluateFiveCards(combo);
    if (!bestHand || isHandBetter(evaluation, bestHand)) {
      bestHand = evaluation;
    }
  }

  return bestHand!;
}

// Get all combinations of k elements from array
function getAllCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map(el => [el]);
  if (k === arr.length) return [arr];

  const results: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombs = getAllCombinations(arr.slice(i + 1), k - 1);
    for (const tailComb of tailCombs) {
      results.push([head, ...tailComb]);
    }
  }
  return results;
}

// Evaluate exactly 5 cards
function evaluateFiveCards(cards: Card[]): HandEvaluation {
  const sorted = [...cards].sort((a, b) => {
    const aVal = a.type === 1 ? 14 : a.type;
    const bVal = b.type === 1 ? 14 : b.type;
    return bVal - aVal;
  });

  const values = sorted.map(c => c.type === 1 ? 14 : c.type);
  const suits = sorted.map(c => c.suit);

  // Count occurrences of each value
  const valueCounts: { [key: number]: number } = {};
  values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);

  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  const uniqueValues = Object.keys(valueCounts).map(Number).sort((a, b) => b - a);

  // Check for flush
  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight
  const isStraight = values.every((v, i) => i === 0 || values[i - 1] - v === 1);
  const isLowStraight = values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2;
  const hasStraight = isStraight || isLowStraight;

  // Royal Flush: A-K-Q-J-10 all same suit
  if (isFlush && isStraight && values[0] === 14 && values[4] === 10) {
    return { rank: HandRank.RoyalFlush, rankName: 'Royal Flush', values, cards: sorted };
  }

  // Straight Flush
  if (isFlush && hasStraight) {
    return { rank: HandRank.StraightFlush, rankName: 'Straight Flush', values, cards: sorted };
  }

  // Four of a Kind
  if (counts[0] === 4) {
    const quadValue = uniqueValues.find(v => valueCounts[v] === 4)!;
    const kicker = uniqueValues.find(v => v !== quadValue)!;
    return { rank: HandRank.FourOfAKind, rankName: 'Four of a Kind', values: [quadValue, kicker], cards: sorted };
  }

  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const tripValue = uniqueValues.find(v => valueCounts[v] === 3)!;
    const pairValue = uniqueValues.find(v => valueCounts[v] === 2)!;
    return { rank: HandRank.FullHouse, rankName: 'Full House', values: [tripValue, pairValue], cards: sorted };
  }

  // Flush
  if (isFlush) {
    return { rank: HandRank.Flush, rankName: 'Flush', values, cards: sorted };
  }

  // Straight
  if (hasStraight) {
    const straightValues = isLowStraight ? [5, 4, 3, 2, 1] : values;
    return { rank: HandRank.Straight, rankName: 'Straight', values: straightValues, cards: sorted };
  }

  // Three of a Kind
  if (counts[0] === 3) {
    const tripValue = uniqueValues.find(v => valueCounts[v] === 3)!;
    const kickers = uniqueValues.filter(v => v !== tripValue);
    return { rank: HandRank.ThreeOfAKind, rankName: 'Three of a Kind', values: [tripValue, ...kickers], cards: sorted };
  }

  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = uniqueValues.filter(v => valueCounts[v] === 2).sort((a, b) => b - a);
    const kicker = uniqueValues.find(v => valueCounts[v] === 1)!;
    return { rank: HandRank.TwoPair, rankName: 'Two Pair', values: [...pairs, kicker], cards: sorted };
  }

  // One Pair
  if (counts[0] === 2) {
    const pairValue = uniqueValues.find(v => valueCounts[v] === 2)!;
    const kickers = uniqueValues.filter(v => v !== pairValue);
    return { rank: HandRank.Pair, rankName: 'Pair', values: [pairValue, ...kickers], cards: sorted };
  }

  // High Card
  return { rank: HandRank.HighCard, rankName: 'High Card', values, cards: sorted };
}

// Compare two hands - returns true if hand1 is better than hand2
function isHandBetter(hand1: HandEvaluation, hand2: HandEvaluation): boolean {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank > hand2.rank;
  }

  // Same rank, compare values
  for (let i = 0; i < Math.min(hand1.values.length, hand2.values.length); i++) {
    if (hand1.values[i] !== hand2.values[i]) {
      return hand1.values[i] > hand2.values[i];
    }
  }

  return false; // Tie
}

// Determine winner from multiple player hands
export function determineWinner(
  players: { id: string; username: string; hand: Card[] }[],
  communalCards: Card[]
): { winnerId: string; winnerName: string; handRank: string; isTie: boolean; tiedPlayers?: string[] } {
  const evaluations = players.map(player => ({
    player,
    evaluation: evaluateHand([...player.hand, ...communalCards]),
  }));

  // Find the best hand
  let bestEval = evaluations[0];
  for (let i = 1; i < evaluations.length; i++) {
    if (isHandBetter(evaluations[i].evaluation, bestEval.evaluation)) {
      bestEval = evaluations[i];
    }
  }

  // Check for ties
  const winners = evaluations.filter(e =>
    e.evaluation.rank === bestEval.evaluation.rank &&
    JSON.stringify(e.evaluation.values) === JSON.stringify(bestEval.evaluation.values)
  );

  if (winners.length > 1) {
    return {
      winnerId: '',
      winnerName: 'Tie',
      handRank: bestEval.evaluation.rankName,
      isTie: true,
      tiedPlayers: winners.map(w => w.player.username),
    };
  }

  return {
    winnerId: bestEval.player.id,
    winnerName: bestEval.player.username,
    handRank: bestEval.evaluation.rankName,
    isTie: false,
  };
}
