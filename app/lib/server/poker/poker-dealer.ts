// app/lib/server/poker/poker-dealer.ts

import { createDeck, shuffleDeck } from '@/app/lib/utils/poker';
import type { Player, Card } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';

/**
 * Initialize a new shuffled deck
 */
export function initializeDeck(): Card[] {
  return shuffleDeck(createDeck());
}

/**
 * Deal cards to players one at a time (proper poker dealing)
 * Cards are dealt in rotation: P1 gets 1 card, P2 gets 1 card, P1 gets 2nd card, P2 gets 2nd card
 */
export function dealPlayerCards(deck: Card[], players: Player[], cardsPerPlayer: number = 2): void {
  // Deal one card at a time, rotating through players
  for (let round = 0; round < cardsPerPlayer; round++) {
    for (let player of players) {
      if (deck.length > 0) {
        const card = deck.shift()!;
        player.hand.push(card);
      }
    }
  }
}

/**
 * Deal communal cards based on current stage
 * - Preflop → Flop: Deal 3 cards
 * - Flop → Turn: Deal 1 card
 * - Turn → River: Deal 1 card
 *
 * Returns the number of cards dealt and stage name
 */
export function dealCommunalCards(
  deck: Card[],
  communalCards: Card[],
  currentStage: GameStage
): { numCards: number; stageName: string; newStage: GameStage } | null {
  if (currentStage >= GameStage.River) {
    return null;
  }

  let numCards = 0;
  let stageName = '';

  if (currentStage === GameStage.Preflop) {
    numCards = 3; // Flop
    stageName = 'FLOP';
  } else if (currentStage === GameStage.Flop) {
    numCards = 1; // Turn
    stageName = 'TURN';
  } else {
    numCards = 1; // River
    stageName = 'RIVER';
  }

  // Deal cards from deck to communal cards
  communalCards.push(...deck.splice(0, numCards));

  const newStage = currentStage + 1;

  return { numCards, stageName, newStage };
}

/**
 * Collect all cards from the game state (deck, communal, and player hands)
 */
export function collectAllCards(
  deck: Card[],
  communalCards: Card[],
  players: Player[]
): Card[] {
  const allCards: Card[] = [
    ...deck,
    ...communalCards,
    ...players.flatMap((p: Player) => p.hand),
  ];

  return allCards;
}

/**
 * Collect and reshuffle all cards from game state
 * Used for game restart
 */
export function reshuffleAllCards(
  deck: Card[],
  communalCards: Card[],
  players: Player[]
): Card[] {
  const allCards = collectAllCards(deck, communalCards, players);
  const shuffled = shuffleDeck(allCards);

  return shuffled;
}

/**
 * Ensure communal cards have the correct count for current stage
 * Safety check to fill missing cards if needed
 */
export function ensureCommunalCardsComplete(
  deck: Card[],
  communalCards: Card[],
  requiredCount: number
): void {
  const currentCount = communalCards.length;

  if (currentCount >= requiredCount) {
    return;
  }

  const needed = requiredCount - currentCount;
  console.error(`[Dealer] Missing communal cards: ${currentCount} / ${requiredCount} - dealing ${needed} more`);

  if (deck.length >= needed) {
    communalCards.push(...deck.splice(0, needed));
  } else {
    console.error(`[Dealer] Not enough cards in deck! Need ${needed}, have ${deck.length}`);
  }
}
