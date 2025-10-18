// app/holdem/page.tsx

'use client';

import { PokerProvider, usePoker } from './poker-provider';
import { useUser } from '../lib/providers/user-provider';
import PlayerList from './player-list';

function PokerGameUI() {
  const {
    players,
    communalCards,
    potTotal,
    addPlayer,
    deal,
    restart,
    stages,
    stage,
    playing,
  } = usePoker();

  const { user: currentUser } = useUser();

  if (!currentUser) {
    throw new Error('Must be signed in to play.');
  }

  const alreadyJoined = players.some((p) => p.name === currentUser.username);

  return (
    <div className="p-6 space-y-6 font-sans max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-4">Texas Hold’em</h1>

      {/* 👥 Join Button */}
      <div className="flex justify-center">
        <button
          onClick={() => addPlayer(currentUser.username)}
          disabled={alreadyJoined}
          className={`px-4 py-2 rounded text-white ${
            alreadyJoined
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {alreadyJoined ? 'Joined' : 'Join Game'}
        </button>
      </div>

      <div>
        <p>{playing ? 'Playing' : 'Not Playing'}</p>
      </div>

      {/* 🎮 Controls */}
      <div className="flex justify-center gap-3 mt-4">
        {stage < stages.length ? (
          <button
            onClick={deal}
            disabled={players.length < 2}
            className={`px-4 py-2 rounded text-white ${
              players.length < 2 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            Deal {stages[stage]}
          </button>
        ) : (
          <button
            onClick={restart}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Restart
          </button>
        )}
      </div>

      {/* 🧍 Players */}
      <section>
        <h2 className="font-semibold text-xl mb-2">Players</h2>
        <PlayerList />
      </section>

      {/* 🃏 Communal Cards */}
      <section>
        <h2 className="font-semibold text-xl mb-2">Community Cards</h2>
        <ul className="flex gap-2">
          {communalCards.map((card, i) => (
            <li
              key={i}
              className="border rounded px-2 py-1 text-lg font-mono"
              style={{ color: card.color }}
            >
              {card.label} {card.symbol}
            </li>
          ))}
        </ul>
      </section>

      {/* 💰 Pot */}
      <section className="text-center">
        <div className="font-bold text-xl mt-6">Pot: ${potTotal}</div>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <PokerProvider>
      <PokerGameUI />
    </PokerProvider>
  );
}
