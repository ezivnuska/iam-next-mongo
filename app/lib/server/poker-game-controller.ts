// app/lib/server/poker-game-controller.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import { createDeck, shuffleDeck, createChips } from '@/app/lib/utils/poker';
import type { Bet, Card, Player } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';
import { randomBytes } from 'crypto';

export async function getGame(gameId: string) {
  return await PokerGame.findById(gameId);
}

export async function createGame() {
  const deck = shuffleDeck(createDeck());
  const code = randomBytes(3).toString('hex').toUpperCase();

  const game = await PokerGame.create({
    code,
    deck,
    communalCards: [],
    pot: [],
    players: [],
    stage: Number(GameStage.Cards), // Ensure it's stored as number 0
    playing: false,
    currentPlayerIndex: 0,
    currentBet: 0,
    playerBets: [],
  });

  return game.toObject();
}

export async function addPlayer(
  gameId: string,
  user: { id: string; username: string }
) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  const alreadyIn = game.players.some((p: Player) => p.id === user.id);
  if (alreadyIn) return game.toObject();

  game.players.push({
    id: user.id,
    username: user.username,
    hand: [],
    chips: createChips(100),
  });

  await game.save();
  return game.toObject();
}

export async function deal(gameId: string) {
  // Retry logic for version conflicts
  let retries = 3;
  while (retries > 0) {
    try {
      const game = await PokerGame.findById(gameId);
      if (!game) throw new Error('Game not found');

      // Convert stage to number to avoid string concatenation
      const currentStage = Number(game.stage);

      if (currentStage > GameStage.River) return game.toObject();

      const deck = [...game.deck];
      const communal = [...game.communalCards];
      const players = game.players.map((p: Player) => ({ ...p }));

      let numCards = 0;
      if (currentStage === GameStage.Cards) numCards = 2;
      else if (currentStage === GameStage.Flop) numCards = 3;
      else numCards = 1;

      if (currentStage === GameStage.Cards) {
        players.forEach((p: Player) => {
          p.hand = [...(p.hand || []), ...deck.splice(0, numCards)];
        });
      } else {
        communal.push(...deck.splice(0, numCards));
      }

      game.deck = deck;
      game.communalCards = communal;
      game.players = players as any;
      game.playing = true;

      // Reset betting round (stage advancement now handled by placeBet)
      game.currentBet = 0;
      game.playerBets = new Array(game.players.length).fill(0);

      await game.save();

      return game.toObject();
    } catch (error: any) {
      if (error.name === 'VersionError' && retries > 1) {
        retries--;
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 50));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to deal after retries');
}

export async function placeBet(gameId: string, playerId: string, chipCount = 1) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  const playerIndex = game.players.findIndex((p: Player) => p.id === playerId);
  if (playerIndex === -1) throw new Error('Player not found');

  // Initialize playerBets array if needed
  if (game.playerBets.length !== game.players.length) {
    game.playerBets = new Array(game.players.length).fill(0);
  }

  const player = game.players[playerIndex];
  const chipsToRemove = player.chips.splice(0, chipCount);

  // Add to pot
  game.pot.push({
    player: player.username,
    chips: chipsToRemove,
  });

  // Update player's total bet for this round
  game.playerBets[playerIndex] += chipCount;

  // Check if this is a raise (betting more than current highest)
  const isRaise = game.playerBets[playerIndex] > game.currentBet;
  if (isRaise) {
    game.currentBet = game.playerBets[playerIndex];
  }

  game.players[playerIndex] = player;

  // Move to next player
  const nextIndex = (playerIndex + 1) % game.players.length;
  game.currentPlayerIndex = nextIndex;

  // Check if betting round is complete (all players have matched the current bet)
  const allPlayersMatched = game.playerBets.every((bet: number) => bet === game.currentBet);

  if (allPlayersMatched) {
    // All players matched - advance to next stage and deal cards
    const currentStage = Number(game.stage);
    if (currentStage < GameStage.River) {
      game.stage = currentStage + 1;

      // Deal cards for the new stage
      const deck = [...game.deck];
      const communal = [...game.communalCards];

      let numCards = 0;
      if (game.stage === GameStage.Flop) numCards = 3;
      else numCards = 1; // Turn or River

      communal.push(...deck.splice(0, numCards));

      game.deck = deck;
      game.communalCards = communal;
    }
    // Reset betting round
    game.currentBet = 0;
    game.playerBets = new Array(game.players.length).fill(0);
    game.currentPlayerIndex = 0;
  } else if (isRaise && nextIndex === 0) {
    // A raise happened and we've completed one round - reset to player 0
    game.currentPlayerIndex = 0;
  }

  await game.save();
  return game.toObject();
}

export async function finishTurn(gameId: string, playerId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  const currentIndex = game.players.findIndex((p: Player) => p.id === playerId);
  if (currentIndex === -1) throw new Error('Player not found');

  const nextIndex = (currentIndex + 1) % game.players.length;
  game.currentPlayerIndex = nextIndex;

  await game.save();
  return game.toObject();
}

export async function restart(gameId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  const allCards: Card[] = [
    ...game.deck,
    ...game.communalCards,
    ...game.players.flatMap((p: Player) => p.hand),
  ];

  game.deck = shuffleDeck(allCards);
  game.communalCards = [];
  game.pot = [];
  game.stage = Number(GameStage.Cards); // Ensure it's a number
  game.playing = false;
  game.currentPlayerIndex = 0; // Reset to first player
  game.currentBet = 0; // Reset betting
  game.playerBets = new Array(game.players.length).fill(0);

  game.players = game.players.map((p: Player) => ({
    ...p,
    hand: [],
  }));

  await game.save();
  return game.toObject();
}
