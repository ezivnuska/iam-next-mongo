// app/holdem/poker-provider.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  GameStage,
  STAGE_NAMES,
  type Bet,
  type Card,
  type Chip,
  type Player,
} from './definitions';

interface PokerContextType {
  players: Player[];
  communalCards: Card[];
  deck: Card[];
  pot: Bet[];
  stage: GameStage;
  playing: boolean;
  stages: readonly string[];
  addPlayer: (name: string) => void;
  deal: () => void;
  restart: () => void;
  placeBet: (playerId: number) => void;
  potTotal: number;
}

const PokerContext = createContext<PokerContextType | undefined>(undefined);

export function PokerProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [communalCards, setCommunalCards] = useState<Card[]>([]);
  const [pot, setPot] = useState<Bet[]>([]);
  const [stage, setStage] = useState<GameStage>(GameStage.Cards);
  const [playing, setPlaying] = useState(false);

  const stages = STAGE_NAMES;

  // 🎴 Initialize a shuffled deck & add mock player
  useEffect(() => {
    setDeck(shuffle(createDeck()));

    // Add a mock "Guest" player automatically on load
    setPlayers([
      {
        id: 0,
        name: 'Guest',
        hand: [],
        chips: Array.from({ length: 100 }, () => ({ value: 10 })),
        currentPlayer: true,
      },
    ]);
  }, []);

  useEffect(() => {
    console.log('new stage', stage, stages[stage])
  }, [stage])

  // ♠️ Create and shuffle deck
  function createDeck(): Card[] {
    const suits = ['hearts', 'clubs', 'diamonds', 'spades'] as const;
    const newDeck: Card[] = [];

    for (const suit of suits) {
      for (let i = 1; i <= 13; i++) {
        const label =
          i === 1 ? 'A' : i === 11 ? 'J' : i === 12 ? 'Q' : i === 13 ? 'K' : i.toString();
        const color = suit === 'hearts' || suit === 'diamonds' ? '#f00' : '#000';
        const symbols: Record<(typeof suits)[number], string> = {
          hearts: '♥',
          diamonds: '♦',
          clubs: '♣',
          spades: '♠',
        };
        newDeck.push({ type: i, suit, color, label, symbol: symbols[suit] });
      }
    }

    return newDeck;
  }

  function shuffle<T>(array: T[]): T[] {
    return [...array].sort(() => Math.random() - 0.5);
  }

  // 👤 Add player
  function addPlayer(name: string) {
    if (!name.trim()) return;
    const newPlayer: Player = {
      id: players.length,
      name,
      hand: [],
      chips: Array.from({ length: 100 }, () => ({ value: 10 })),
      currentPlayer: false,
    };
    setPlayers((prev) => [...prev, newPlayer]);
  }

  // 🎯 Deal logic
  function deal() {
    console.log('dealing', stage, stages[stage])
    if (stage > GameStage.River) return; // safety
    setPlaying(true);
  
    const newPlayers = [...players];
    const newDeck = [...deck];
    const newCommunal = [...communalCards];
    console.log('stage-->', stage)
    console.log('GameStage.Deal', GameStage.Cards)
    console.log('stages[stage]', stages[stage])
    console.log('players.length', players.length)
    switch (stage) {
      case GameStage.Cards:
        // 🂡 Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
          newPlayers.forEach((p) => {
            const card = newDeck.shift();
            if (card) p.hand.push(card);
          });
        }
        break;
  
      case GameStage.Flop:
        console.log('dealing flop...')
        // 🃏 Flop (3 communal cards)
        for (let i = 0; i < 3; i++) {
          const card = newDeck.shift();
          if (card) newCommunal.push(card);
        }
        break;
  
      case GameStage.Turn:
      case GameStage.River:
        // 🂠 Turn and River (1 card each)
        const card = newDeck.shift();
        if (card) newCommunal.push(card);
        break;
  
      default:
        break;
    }
  
    setDeck(newDeck);
    setPlayers(newPlayers);
    setCommunalCards(newCommunal);
  
    // ⏭ Move to the next stage (but stop at River)
    setStage((prev) => {
      const nextStage = prev + 1;
      return nextStage > GameStage.River ? GameStage.River : (nextStage as GameStage);
    });
  }  

  // 💰 Place a bet
  function placeBet(playerId: number) {
    const newPlayers = [...players];
    const player = newPlayers[playerId];
    const chip = player.chips.pop();
    if (!chip) return;

    const newBet: Bet = { player: player.name, chips: [chip] };
    setPot([...pot, newBet]);
    setPlayers(newPlayers);
  }

  // 🔄 Restart
  function restart() {
    setDeck((prev) => shuffle([...prev, ...communalCards, ...players.flatMap((p) => p.hand)]));
    setCommunalCards([]);
    setPlayers((ps) =>
      ps.map((p) => ({ ...p, hand: [], currentPlayer: p.name === 'Guest', chips: p.chips }))
    );
    setPot([]);
    setStage(GameStage.Cards);
    setPlaying(false);
  }

  // 🧮 Pot total
  const potTotal = pot.reduce(
    (total, bet) => total + bet.chips.reduce((sum, c) => sum + c.value, 0),
    0
  );

  const value: PokerContextType = {
    players,
    communalCards,
    deck,
    pot,
    stage,
    playing,
    stages,
    addPlayer,
    deal,
    restart,
    placeBet,
    potTotal,
  };

  return <PokerContext.Provider value={value}>{children}</PokerContext.Provider>;
}

export function usePoker() {
  const context = useContext(PokerContext);
  if (!context) throw new Error('usePoker must be used inside a PokerProvider');
  return context;
}
