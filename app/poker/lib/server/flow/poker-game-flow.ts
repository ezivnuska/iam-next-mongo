// app/lib/server/poker/poker-game-flow.ts

import { determineWinner } from '@/app/poker/lib/utils/poker';
import type { Bet, Player, GameStageProps, WinnerInfo, PotInfo } from '@/app/poker/lib/definitions/poker';
import { GameStage } from '@/app/poker/lib/definitions/poker';
import { PokerBalance } from '@/app/poker/lib/models/poker-balance';
import { findPlayerByUsername } from '@/app/poker/lib/utils/player-helpers';
import { dealPlayerCards, dealCommunalCardsByStage as dealCommunalCardsFromDealer, ensureCommunalCardsComplete } from './poker-dealer';
import { ActionHistoryType, type GameActionHistory } from '@/app/poker/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { calculateSidePots } from '@/app/poker/lib/utils/side-pot-calculator';


// Type for Mongoose game document with common methods
interface PokerGameDoc {
  _id: any;
  players: Player[];
  deck: any[];
  communalCards: any[];
  pot: Bet[];
  pots?: PotInfo[];
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
 * Skips guest players (no balance persistence for guests)
 */
export async function savePlayerBalances(players: Player[]) {
  const { isGuestId } = await import('@/app/poker/lib/utils/guest-utils');

  // Filter out guest players - they don't have persisted balances
  const authenticatedPlayers = players.filter(player => !isGuestId(player.id));

  if (authenticatedPlayers.length === 0) {
    return;
  }

  const balanceUpdates = authenticatedPlayers.map(player =>
    PokerBalance.findOneAndUpdate(
      { userId: player.id },
      { chipCount: player.chipCount },
      { upsert: true, new: true }
    )
  );

  await Promise.all(balanceUpdates);
}

/**
 * Award pot chips to the winner(s)
 * Handles both single winner and tie scenarios
 * Supports multiple pots (main pot + side pots) for all-in scenarios
 */
export function awardPotToWinners(game: PokerGameDoc, winnerInfo: WinnerInfo): void {
  // CHIP CONSERVATION CHECK: Track total chips before awarding pot
  const totalChipsBefore = game.players.reduce((sum, p) => sum + p.chipCount, 0);
  const potTotal = game.pot.reduce((sum: number, bet: Bet) => sum + bet.chipCount, 0);

  // Calculate cumulative bets from game.pot (tracks ALL bets across all stages)
  // playerBets is reset each stage, so we need to reconstruct total bets from game.pot
  const cumulativePlayerBets = new Array(game.players.length).fill(0);

  game.pot.forEach((bet: Bet) => {
    const playerIndex = game.players.findIndex((p: Player) => p.username === bet.player);
    if (playerIndex !== -1) {
      cumulativePlayerBets[playerIndex] += bet.chipCount;
    }
  });


  // Calculate side pots from cumulative bets (not current stage bets)
  const sidePots = calculateSidePots(game.players, cumulativePlayerBets);

  // Store calculated pots in game for client display
  game.pots = sidePots;
  game.markModified('pots');
  game.markModified('players'); // Mark players as modified since we'll update chipCount


  // If no side pots, fall back to legacy pot distribution
  if (sidePots.length === 0) {
    const potTotal = game.pot.reduce((sum: number, bet: Bet) => sum + bet.chipCount, 0);

    if (winnerInfo.isTie && winnerInfo.tiedPlayers) {
      // Split pot among tied players
      const chipsPerWinner = Math.floor(potTotal / winnerInfo.tiedPlayers.length);
      winnerInfo.tiedPlayers.forEach((username: string) => {
        const player = findPlayerByUsername(game.players, username);
        if (player) {
          player.chipCount += chipsPerWinner;
        }
      });
      // Any remaining chips go to first tied player
      const remainder = potTotal % winnerInfo.tiedPlayers.length;
      if (remainder > 0) {
        const firstWinner = findPlayerByUsername(game.players, winnerInfo.tiedPlayers![0]);
        if (firstWinner) {
          firstWinner.chipCount += remainder;
        }
      }
    } else {
      // Single winner gets entire pot
      const winner = game.players.find((p: Player) => p.id === winnerInfo.winnerId);
      if (winner) {
        winner.chipCount += potTotal;
      }
    }
    return;
  }

  // Award each pot separately
  const potWinnings: { potIndex: number; amount: number }[] = [];

  for (let potIndex = 0; potIndex < sidePots.length; potIndex++) {
    const pot = sidePots[potIndex];


    // Get eligible players who haven't folded
    const eligiblePlayers = game.players.filter(p =>
      pot.eligiblePlayers.includes(p.id) && !p.folded
    );

    if (eligiblePlayers.length === 0) {
      console.warn(`[AwardPot] No eligible players for pot ${potIndex}, skipping`);
      continue;
    }

    // Determine winner among eligible players for this pot
    const potWinner = determineWinner(
      eligiblePlayers.map((p: Player) => ({
        id: p.id,
        username: p.username,
        hand: p.hand,
      })),
      game.communalCards
    );


    // The pot amount is already calculated in sidePots
    const potAmount = pot.amount;

    // Award chips to winner(s) of this pot
    if (potWinner.isTie && potWinner.tiedPlayers) {
      // Split pot among tied players
      const chipsPerWinner = Math.floor(potAmount / potWinner.tiedPlayers.length);
      const remainder = potAmount % potWinner.tiedPlayers.length;

      potWinner.tiedPlayers.forEach((username: string, index: number) => {
        const player = findPlayerByUsername(game.players, username);
        if (player && pot.eligiblePlayers.includes(player.id)) {
          const wonChips = chipsPerWinner + (index === 0 ? remainder : 0); // First player gets remainder
          player.chipCount += wonChips;
        }
      });
    } else {
      // Single winner gets entire pot
      const winner = game.players.find((p: Player) => p.id === potWinner.winnerId);
      if (winner && pot.eligiblePlayers.includes(winner.id)) {
        winner.chipCount += potAmount;

        // Track winnings for main winner info
        if (winner.id === winnerInfo.winnerId) {
          potWinnings.push({ potIndex, amount: potAmount });
        }
      }
    }
  }

  // Update winner info with pot winnings breakdown
  if (potWinnings.length > 0) {
    winnerInfo.potWinnings = potWinnings;
  }

  // CHIP CONSERVATION CHECK: Verify total chips after awarding pot
  const totalChipsAfter = game.players.reduce((sum, p) => sum + p.chipCount, 0);
  const expectedTotal = totalChipsBefore + potTotal;
  if (totalChipsAfter !== expectedTotal) {
    console.error(`[AwardPot] ❌ CHIP MISMATCH! Lost ${expectedTotal - totalChipsAfter} chips!`);
    console.error(`[AwardPot] Player chip counts:`, game.players.map(p => `${p.username}=${p.chipCount}`));
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




