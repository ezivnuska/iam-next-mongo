// app/poker/lib/server/ai-decision-engine.ts

import { evaluateHand, HandRank } from '@/app/poker/lib/utils/poker';
import type { Player, Card } from '@/app/poker/lib/definitions/poker';
import { GameStage } from '@/app/poker/lib/definitions/poker';

/**
 * AI Decision types
 */
export type AIDecision =
  | { action: 'fold' }
  | { action: 'check' }
  | { action: 'call' }
  | { action: 'bet'; amount: number }
  | { action: 'raise'; amount: number }
  | { action: 'all-in' };

/**
 * AI Aggression levels
 */
export enum AggressionLevel {
  TIGHT = 'tight',      // Conservative, only plays strong hands
  BALANCED = 'balanced', // Normal play
  AGGRESSIVE = 'aggressive' // Aggressive, bluffs and raises more
}

/**
 * Hand strength categories
 */
enum HandStrength {
  TRASH = 0,
  WEAK = 1,
  MEDIUM = 2,
  STRONG = 3,
  VERY_STRONG = 4,
  MONSTER = 5
}

/**
 * Evaluate hand strength based on evaluation and stage
 */
function evaluateHandStrength(
  hand: Card[],
  communalCards: Card[],
  stage: GameStage
): HandStrength {
  if (hand.length === 0) return HandStrength.TRASH;

  const allCards = [...hand, ...communalCards];

  // Pre-flop: evaluate pocket cards only
  if (stage === GameStage.Preflop || communalCards.length === 0) {
    return evaluatePreflopStrength(hand);
  }

  // Post-flop: evaluate full hand
  if (allCards.length >= 5) {
    const evaluation = evaluateHand(allCards);
    return mapHandRankToStrength(evaluation.rank, stage);
  }

  return HandStrength.WEAK;
}

/**
 * Evaluate pre-flop hand strength (pocket cards)
 */
function evaluatePreflopStrength(hand: Card[]): HandStrength {
  if (hand.length < 2) return HandStrength.TRASH;

  const [card1, card2] = hand;
  const val1 = card1.type === 1 ? 14 : card1.type;
  const val2 = card2.type === 1 ? 14 : card2.type;
  const isPair = val1 === val2;
  const isSuited = card1.suit === card2.suit;
  const highCard = Math.max(val1, val2);
  const lowCard = Math.min(val1, val2);
  const gap = highCard - lowCard;

  // Premium pairs
  if (isPair && val1 >= 10) return HandStrength.MONSTER; // TT+
  if (isPair && val1 >= 7) return HandStrength.VERY_STRONG; // 77-99
  if (isPair) return HandStrength.STRONG; // 22-66

  // High cards
  if (val1 === 14 && val2 >= 11) return HandStrength.VERY_STRONG; // AK, AQ, AJ
  if (val1 === 14 && val2 >= 10) return HandStrength.STRONG; // AT, A9
  if (val1 >= 13 && val2 >= 11) return HandStrength.STRONG; // KQ, KJ

  // Suited connectors and high suited
  if (isSuited && gap <= 1 && highCard >= 8) return HandStrength.MEDIUM;
  if (isSuited && highCard >= 11) return HandStrength.MEDIUM;

  // Connected cards
  if (gap <= 1 && highCard >= 9) return HandStrength.WEAK;

  return HandStrength.TRASH;
}

/**
 * Map poker hand rank to strength category
 */
function mapHandRankToStrength(rank: HandRank, stage: GameStage): HandStrength {
  switch (rank) {
    case HandRank.RoyalFlush:
    case HandRank.StraightFlush:
      return HandStrength.MONSTER;

    case HandRank.FourOfAKind:
    case HandRank.FullHouse:
      return HandStrength.VERY_STRONG;

    case HandRank.Flush:
    case HandRank.Straight:
      return HandStrength.STRONG;

    case HandRank.ThreeOfAKind:
      return stage === GameStage.Flop ? HandStrength.STRONG : HandStrength.MEDIUM;

    case HandRank.TwoPair:
      return HandStrength.MEDIUM;

    case HandRank.Pair:
      return stage === GameStage.Flop ? HandStrength.WEAK : HandStrength.TRASH;

    case HandRank.HighCard:
    default:
      return HandStrength.TRASH;
  }
}

/**
 * Calculate pot odds (ratio of bet to pot)
 */
function calculatePotOdds(betAmount: number, potSize: number): number {
  if (potSize === 0) return 0;
  return betAmount / (potSize + betAmount);
}

/**
 * Main AI decision function
 */
export function makeAIDecision(
  aiPlayer: Player,
  communalCards: Card[],
  currentBet: number,
  potSize: number,
  playerBet: number,
  stage: GameStage,
  aggression: AggressionLevel = AggressionLevel.BALANCED
): AIDecision {
  console.log(`[AI] Making decision for ${aiPlayer.username}:`, {
    chipCount: aiPlayer.chipCount,
    currentBet,
    playerBet,
    potSize,
    stage,
    communalCards: communalCards.length
  });

  // Calculate how much AI needs to call
  const amountToCall = currentBet - playerBet;
  const canCheck = amountToCall === 0;

  // If no chips, can only check or fold
  if (aiPlayer.chipCount === 0) {
    return { action: 'check' };
  }

  // Evaluate hand strength
  const handStrength = evaluateHandStrength(aiPlayer.hand, communalCards, stage);
  console.log(`[AI] Hand strength: ${HandStrength[handStrength]}`);

  // Calculate pot odds if facing a bet
  const potOdds = amountToCall > 0 ? calculatePotOdds(amountToCall, potSize) : 0;

  // Decision making based on hand strength and situation
  switch (handStrength) {
    case HandStrength.MONSTER:
    case HandStrength.VERY_STRONG:
      return makeStrongHandDecision(aiPlayer, amountToCall, potSize, canCheck, aggression);

    case HandStrength.STRONG:
      return makeMediumStrongHandDecision(aiPlayer, amountToCall, potSize, potOdds, canCheck, aggression);

    case HandStrength.MEDIUM:
      return makeMediumHandDecision(aiPlayer, amountToCall, potSize, potOdds, canCheck, aggression);

    case HandStrength.WEAK:
      return makeWeakHandDecision(aiPlayer, amountToCall, potSize, potOdds, canCheck);

    case HandStrength.TRASH:
    default:
      return makeTrashHandDecision(canCheck, amountToCall, aiPlayer.chipCount, potOdds);
  }
}

/**
 * Decision for monster/very strong hands
 */
function makeStrongHandDecision(
  aiPlayer: Player,
  amountToCall: number,
  potSize: number,
  canCheck: boolean,
  aggression: AggressionLevel
): AIDecision {
  // With strong hands, we want to build the pot
  const maxBet = aiPlayer.chipCount;

  if (canCheck) {
    // Check-raise trap with aggressive play
    if (aggression === AggressionLevel.AGGRESSIVE && Math.random() > 0.3) {
      const betSize = Math.min(Math.floor(potSize * 0.75), maxBet);
      return betSize > 0 ? { action: 'bet', amount: betSize } : { action: 'check' };
    }
    // Sometimes check to trap
    if (Math.random() > 0.5) {
      return { action: 'check' };
    }
    // Otherwise bet for value
    const betSize = Math.min(Math.floor(potSize * 0.5), maxBet);
    return betSize > 0 ? { action: 'bet', amount: betSize } : { action: 'check' };
  }

  // Facing a bet - usually raise for value
  if (amountToCall >= maxBet) {
    return { action: 'call' }; // All-in call
  }

  const raiseSize = Math.min(amountToCall * 2.5, maxBet);
  if (raiseSize > amountToCall && Math.random() > 0.2) {
    return { action: 'raise', amount: Math.floor(raiseSize) };
  }

  return { action: 'call' };
}

/**
 * Decision for medium-strong hands
 */
function makeMediumStrongHandDecision(
  aiPlayer: Player,
  amountToCall: number,
  potSize: number,
  potOdds: number,
  canCheck: boolean,
  aggression: AggressionLevel
): AIDecision {
  const maxBet = aiPlayer.chipCount;

  if (canCheck) {
    // Sometimes bet for value
    if (Math.random() > 0.4 || aggression === AggressionLevel.AGGRESSIVE) {
      const betSize = Math.min(Math.floor(potSize * 0.4), maxBet);
      return betSize > 0 ? { action: 'bet', amount: betSize } : { action: 'check' };
    }
    return { action: 'check' };
  }

  // Facing a bet
  if (amountToCall >= maxBet * 0.5) {
    // Big bet - usually fold unless getting good odds
    if (potOdds < 0.33) {
      return { action: 'call' };
    }
    return { action: 'fold' };
  }

  // Small to medium bet - usually call
  return { action: 'call' };
}

/**
 * Decision for medium hands
 */
function makeMediumHandDecision(
  aiPlayer: Player,
  amountToCall: number,
  potSize: number,
  potOdds: number,
  canCheck: boolean,
  aggression: AggressionLevel
): AIDecision {
  if (canCheck) {
    // Usually check with medium hands
    if (aggression === AggressionLevel.AGGRESSIVE && Math.random() > 0.7) {
      const betSize = Math.min(Math.floor(potSize * 0.3), aiPlayer.chipCount);
      return betSize > 0 ? { action: 'bet', amount: betSize } : { action: 'check' };
    }
    return { action: 'check' };
  }

  // Facing a bet - call if getting good odds
  if (potOdds < 0.25 && amountToCall <= aiPlayer.chipCount * 0.3) {
    return { action: 'call' };
  }

  return { action: 'fold' };
}

/**
 * Decision for weak hands
 */
function makeWeakHandDecision(
  aiPlayer: Player,
  amountToCall: number,
  potSize: number,
  potOdds: number,
  canCheck: boolean
): AIDecision {
  if (canCheck) {
    return { action: 'check' };
  }

  // Only call with weak hands if getting amazing odds and small bet
  if (potOdds < 0.15 && amountToCall <= aiPlayer.chipCount * 0.1) {
    return { action: 'call' };
  }

  return { action: 'fold' };
}

/**
 * Decision for trash hands
 */
function makeTrashHandDecision(
  canCheck: boolean,
  amountToCall: number,
  chipCount: number,
  potOdds: number
): AIDecision {
  if (canCheck) {
    return { action: 'check' };
  }

  // Extremely rare bluff or with incredible pot odds
  if (potOdds < 0.1 && amountToCall <= chipCount * 0.05 && Math.random() > 0.95) {
    return { action: 'call' };
  }

  return { action: 'fold' };
}
