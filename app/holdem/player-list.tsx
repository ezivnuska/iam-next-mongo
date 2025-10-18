// app/holdem/player-list.tsx

'use client';

import React from 'react';
import { usePoker } from './poker-provider';
import { useUser } from '../lib/providers/user-provider';

export default function PlayerList() {
  const { players, placeBet } = usePoker();
  const { user: currentUser } = useUser();

  if (!players || players.length === 0) {
    return <p className="text-gray-500">No players yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {players.map((p) => (
        <li
          key={p.id}
          className={`border rounded p-3 bg-white shadow-sm hover:shadow-md transition ${
            currentUser && p.name === currentUser.username ? 'border-blue-500' : ''
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold">
              {p.name} — Chips: {p.chips.length * 10}
            </span>

            <button
              onClick={() => placeBet(p.id)}
              disabled={p.chips.length === 0}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 rounded"
            >
              Bet
            </button>
          </div>

          <ul className="flex gap-2 mt-2">
            {p.hand.map((card, i) => (
              <li
                key={i}
                className="border rounded px-2 py-1 text-lg font-mono"
                style={{ color: card.color }}
              >
                {card.label} {card.symbol}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
