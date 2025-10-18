// // app/lib/server/poker-game-state.ts
// // Server-authoritative poker game state management

// import type { Card, Player, Bet, GameStage } from '@/app/lib/definitions/poker';
// import { UserRole } from '@/app/lib/definitions/user';
// import { createDeck, shuffleDeck, createChips } from '@/app/lib/utils/poker';
// import Deck from '@/app/ui/poker/deck';

// interface ServerGameState {
//   players: Player[];
//   deck: Card[];
//   communalCards: Card[];
//   pot: Bet[];
//   stage: number;
//   playing: boolean;
// }

// // In-memory game state (single game for now)
// let gameState: ServerGameState = {
//   players: [],
//   deck: shuffleDeck(createDeck()),
//   communalCards: [],
//   pot: [],
//   stage: 0,
//   playing: false,
// };

// const stages: GameStage[] = ['Cards', 'Flop', 'Turn', 'River'];

// export function getGameState(): ServerGameState {
//   return { ...gameState };
// }

// export function addPlayer(userId: string, username: string): ServerGameState {
//   // Check if player already exists
//   if (gameState.players.some(p => p.id === userId)) {
//     return getGameState();
//   }

//   const newPlayer: Player = {
//     id: userId,
//     username,
//     email: '',
//     role: UserRole.User,
//     bio: '',
//     avatar: null,
//     verified: false,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//     hand: [],
//     chips: createChips(100),
//     currentPlayer: false,
//   };
//   console.log('ADDING_PLAYER', newPlayer)
//   gameState.players.push(newPlayer);
//   return getGameState();
// }

// export function removePlayer(userId: string): ServerGameState {
//   gameState.players = gameState.players.filter(p => p.id !== userId);
//   return getGameState();
// }

// export function deal(): ServerGameState {
//   if (gameState.stage >= stages.length) {
//     return getGameState();
//   }
//   console.log('DEALING', { ...gameState, deck: gameState.deck.length })
//   gameState.playing = true;

//   // Set first player as current on initial deal
//   if (gameState.stage === 0) {
//     gameState.players = gameState.players.map((p, idx) => ({
//       ...p,
//       currentPlayer: idx === 0
//     }));
//   }

//   let numCards = 0;
//   if (gameState.stage === 0) numCards = 2;
//   else if (gameState.stage === 1) numCards = 3;
//   else numCards = 1;

//   // Deal cards
//   if (gameState.stage > 0) {
//     // Deal communal cards
//     for (let i = 0; i < numCards; i++) {
//       if (gameState.deck.length > 0) {
//         gameState.communalCards.push(gameState.deck.shift()!);
//       }
//     }
//   } else {
//     // Deal to each player
//     gameState.players = gameState.players.map(player => {
//       const newCards: Card[] = [];
//       for (let i = 0; i < numCards; i++) {
//         if (gameState.deck.length > 0) {
//           newCards.push(gameState.deck.shift()!);
//         }
//       }
//       console.log('returning hand', newCards)
//       return {
//         ...player,
//         hand: [...player.hand, ...newCards]
//       };
//     });
//   }

//   gameState.stage++;

  
//   // Check if game is over
//   if (gameState.stage === stages.length) {
//       console.log('GAME OVER')
//       gameState.players = gameState.players.map(p => ({ ...p, currentPlayer: true }));
//       gameState.playing = false;
//   }
  
//   const returnState = getGameState()
//   console.log('RETURNING', { ...returnState, deck: returnState.deck.length })
//   return returnState
// }

// export function placeBet(playerId: string, chipCount: number = 1): ServerGameState {
//   const playerIndex = gameState.players.findIndex(p => p.id === playerId);
//   if (playerIndex === -1) return getGameState();

//   const player = gameState.players[playerIndex];
//   const chipsToRemove = player.chips.slice(0, chipCount);
//   const remainingChips = player.chips.slice(chipCount);

//   // Add bet to pot
//   gameState.pot.push({
//     player: player.username,
//     chips: chipsToRemove,
//   });

//   // Update player chips
//   gameState.players[playerIndex] = {
//     ...player,
//     chips: remainingChips,
//   };

//   return getGameState();
// }

// export function finishTurn(playerId: string): ServerGameState {
//   const currentIndex = gameState.players.findIndex(p => p.id === playerId);
//   if (currentIndex === -1) return getGameState();

//   const nextIndex = (currentIndex + 1) % gameState.players.length;

//   // Update current player
//   gameState.players = gameState.players.map((p, idx) => ({
//     ...p,
//     currentPlayer: idx === nextIndex,
//   }));

//   // If we've gone full circle, auto-deal next stage
//   if (nextIndex === 0 && gameState.stage < stages.length) {
//     // Will be handled by client calling deal again
//   }

//   return getGameState();
// }

// export function restart(): ServerGameState {
//   // Collect all cards
//   const allCards: Card[] = [...gameState.deck];
//   gameState.players.forEach(player => {
//     allCards.push(...player.hand);
//   });
//   allCards.push(...gameState.communalCards);

//   // Reset game state
//   gameState.deck = shuffleDeck(allCards);
//   gameState.communalCards = [];
//   gameState.pot = [];
//   gameState.stage = 0;
//   gameState.playing = false;

//   // Clear player hands
//   gameState.players = gameState.players.map(p => ({
//     ...p,
//     hand: [],
//     currentPlayer: false
//   }));

//   return getGameState();
// }
