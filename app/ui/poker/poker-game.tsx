// app/ui/poker/poker-game.tsx

'use client';

import { useEffect } from 'react';
import { usePoker } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import PlayerList from './player-list';
import CommunalCards from './communal-cards';
import Pot from './pot';
import Dealer from './dealer';

export default function PokerGame() {
  const {
    players,
    gameId,
    availableGames,
    createAndJoinGame,
    joinGame,
    deal,
    restart,
    stage,
    stages,
    playing,
    currentPlayerIndex
  } = usePoker();
  const { user } = useUser();

  const isUserInGame = user?.username && players.some(p => p.username === user.username);
  const canDeal = players.length > 1;
  const showDealButton = canDeal && stage < stages.length;
  const showRestartButton = stage === stages.length;
  const showLobby = !gameId || !isUserInGame;

  // Auto-deal when 2 players are present
  useEffect(() => {
    if (players.length === 2 && !playing && gameId) {
      deal();
    }
  }, [players.length, playing, gameId, deal]);

  return (
    <div id="game">
      {showLobby && (
        <div id="lobby">
          <h2>Poker Lobby</h2>

          {availableGames.length === 0 ? (
            <div>
              <p>No games available. Create one to get started!</p>
              <button onClick={createAndJoinGame}>Create New Game</button>
            </div>
          ) : (
            <div>
              <h3>Available Games:</h3>
              <ul>
                {availableGames.map(game => (
                  <li key={game.id}>
                    <span>Game {game.code}</span>
                    <button onClick={() => joinGame(game.id)}>Join Game</button>
                  </li>
                ))}
              </ul>
              <button onClick={createAndJoinGame}>Create New Game</button>
            </div>
          )}
        </div>
      )}

      {!showLobby && (
        <>
          <div id="controls">
            {showDealButton && (
              <button id="deal" onClick={deal}>
                Deal {stages[stage]}
              </button>
            )}
            {showRestartButton && (
              <button id="restart" onClick={restart}>
                Restart
              </button>
            )}
          </div>

          <PlayerList players={players} playing={playing} currentPlayerIndex={currentPlayerIndex} />
          <Pot />
          <CommunalCards />
          <Dealer />
        </>
      )}
    </div>
  );
}
