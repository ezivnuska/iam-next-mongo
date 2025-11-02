// app/lib/server/poker/poker-game-flow.ts

import { determineWinner } from '@/app/poker/lib/utils/poker';
import type { Bet, Player, GameStageProps, WinnerInfo } from '@/app/poker/lib/definitions/poker';
import { GameStage } from '@/app/poker/lib/definitions/poker';
import { PokerBalance } from '@/app/poker/lib/models/poker-balance';
import { findPlayerByUsername } from '@/app/poker/lib/utils/player-helpers';
import { dealPlayerCards, dealCommunalCards as dealCommunalCardsFromDealer, ensureCommunalCardsComplete } from './poker-dealer';
import { ActionHistoryType, type GameActionHistory } from '@/app/poker/lib/definitions/action-history';
import { randomBytes } from 'crypto';

// Type for Mongoose game document with common methods
interface PokerGameDoc {
  _id: any;
  players: Player[];
  deck: any[];
  communalCards: any[];
  pot: Bet[];
  stage: number;
  playerBets: number[];
  currentPlayerIndex: number;
  dealerButtonPosition?: number;
  winner?: WinnerInfo;
  locked: boolean;
  stages?: GameStageProps[];
  actionHistory: GameActionHistory[];
  actionTimer?: any;
  markModified: (path: string) => void;
  modifiedPaths: () => string[];
  save: () => Promise<any>;
}

/**
 * Save all players' chip balances to the database
 */
export async function savePlayerBalances(players: Player[]) {
  const balanceUpdates = players.map(player =>
    PokerBalance.findOneAndUpdate(
      { userId: player.id },
      { chips: player.chips },
      { upsert: true, new: true }
    )
  );

  await Promise.all(balanceUpdates);
}

/**
 * Award pot chips to the winner(s)
 * Handles both single winner and tie scenarios
 */
export function awardPotToWinners(game: PokerGameDoc, winnerInfo: WinnerInfo): void {
  const potChips = game.pot.flatMap((bet: Bet) => bet.chips);

  if (winnerInfo.isTie && winnerInfo.tiedPlayers) {
    // Split pot among tied players
    const chipsPerWinner = Math.floor(potChips.length / winnerInfo.tiedPlayers.length);
    winnerInfo.tiedPlayers.forEach((username: string) => {
      const player = findPlayerByUsername(game.players, username);
      if (player) {
        player.chips.push(...potChips.splice(0, chipsPerWinner));
      }
    });
    // Any remaining chips go to first tied player
    if (potChips.length > 0) {
      const firstWinner = findPlayerByUsername(game.players, winnerInfo.tiedPlayers![0]);
      if (firstWinner) {
        firstWinner.chips.push(...potChips);
      }
    }
  } else {
    // Single winner gets entire pot
    const winner = game.players.find((p: Player) => p.id === winnerInfo.winnerId);
    if (winner) {
      winner.chips.push(...potChips);
    }
  }
}

/**
 * Deal communal cards for the next stage using the dealer module
 * Updates game state with new cards and advances stage
 */
export function dealCommunalCards(game: PokerGameDoc, currentStage: GameStage): void {
  const result = dealCommunalCardsFromDealer(game.deck, game.communalCards, currentStage);

  if (!result) {
    return; // Already at River
  }

  game.stage = result.newStage;

  // Mark arrays as modified so Mongoose saves the changes
  game.markModified('deck');
  game.markModified('communalCards');

  // Note: Action logging will be done by caller which has access to gameId
}

/**
 * Reset betting state for a new betting round
 */
export function resetBettingRound(game: PokerGameDoc): void {
  game.playerBets = new Array(game.players.length).fill(0);

  // Standard poker position rules for postflop:
  // - First to act is the first player left of the button who is still in
  // - In heads-up: Big blind acts first postflop
  // - In 3+ players: Small blind (button + 1) acts first postflop
  const isHeadsUp = game.players.length === 2;
  const isPostflop = game.stage > 0;
  const buttonPosition = game.dealerButtonPosition || 0;

  if (isPostflop) {
    if (isHeadsUp) {
      // Heads-up postflop: Big blind acts first (non-button player)
      game.currentPlayerIndex = (buttonPosition + 1) % game.players.length;
    } else {
      // 3+ players postflop: Small blind acts first (left of button)
      game.currentPlayerIndex = (buttonPosition + 1) % game.players.length;
    }
  } else {
    // Preflop: currentPlayerIndex already set by placeBigBlind
    // Don't override it here
  }

  // Mark paths as modified for Mongoose to track changes
  game.markModified('playerBets');
  game.markModified('currentPlayerIndex');
}

/**
 * Complete the current betting round and advance to the next stage
 * Returns info about what happened for socket event emission
 */
export async function completeRoundAndAdvanceStage(game: PokerGameDoc): Promise<{
  roundComplete: boolean;
  cardsDealt: boolean;
  gameComplete: boolean
}> {
  const currentStage = Number(game.stage);

  // Store stage history (optional for analytics)
  const stageData: GameStageProps = {
    players: game.players.map((p: Player) => ({ ...p })),
    bets: [...game.pot],
  };
  if (!game.stages) game.stages = [];
  game.stages.push(stageData);

  let gameComplete = false;
  let cardsDealt = false;

  // Note: Hole cards are now dealt immediately after blinds (standard poker rules)
  // This function only handles communal card dealing and stage advancement

  if (currentStage === GameStage.River) {

    // Safety check: Ensure we have all 5 communal cards before determining winner
    ensureCommunalCardsComplete(game.deck, game.communalCards, 5);
    game.markModified('deck');
    game.markModified('communalCards');

    // Determine winner after River
    const winnerInfo = determineWinner(
      game.players.map((p: Player) => ({
        id: p.id,
        username: p.username,
        hand: p.hand,
      })),
      game.communalCards
    );

    game.winner = winnerInfo;
    awardPotToWinners(game, winnerInfo);
    game.markModified('players'); // Mark modified after awarding pot

    game.pot = [];
    game.locked = false;
    gameComplete = true;

    // Save all players' chip balances
    await savePlayerBalances(game.players);

    // Add action history directly to document (avoid separate save)
    game.actionHistory.push({
      id: randomBytes(8).toString('hex'),
      timestamp: new Date(),
      stage: currentStage,
      actionType: ActionHistoryType.GAME_ENDED,
      winnerId: winnerInfo.winnerId,
      winnerName: winnerInfo.winnerName,
    });
    game.markModified('actionHistory');
  } else {
    // Advance to next stage and deal communal cards
    const prevStage = currentStage;
    dealCommunalCards(game, currentStage);
    const newStage = game.stage;
    cardsDealt = true;

    // Determine how many cards were dealt
    const numCardsDealt = prevStage === GameStage.Preflop ? 3 : 1;

    // Add action history directly to document (avoid separate saves)
    game.actionHistory.push({
      id: randomBytes(8).toString('hex'),
      timestamp: new Date(),
      stage: newStage,
      actionType: ActionHistoryType.CARDS_DEALT,
      cardsDealt: numCardsDealt,
    });
    game.actionHistory.push({
      id: randomBytes(8).toString('hex'),
      timestamp: new Date(),
      stage: newStage,
      actionType: ActionHistoryType.STAGE_ADVANCED,
      fromStage: prevStage,
      toStage: newStage,
    });
    game.markModified('actionHistory');
  }

  // Reset betting round for next stage
  resetBettingRound(game);

  // Clear any existing timer
  game.actionTimer = undefined;

  return { roundComplete: true, cardsDealt, gameComplete };
}
