// app/ui/poker/poker-game.tsx

'use client';

import { useEffect, useMemo } from 'react';
import { usePoker } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { evaluateHand } from '@/app/lib/utils/poker';
import PlayerList from './player-list';
import CommunalCards from './communal-cards';
import Pot from './pot';
import { Button } from '../button';

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
    currentPlayerIndex,
    winner,
    communalCards,
    leaveGame,
    deleteGameFromLobby
  } = usePoker();
  const { user } = useUser();

  const isUserInGame = user?.username && players.some(p => p.username === user.username);
  const canDeal = players.length > 1;
  const showDealButton = canDeal && stage < stages.length;
  const showRestartButton = stage === stages.length;
  const showLobby = !gameId || !isUserInGame;

  // Evaluate best hand among all players
  const bestHandInfo = useMemo(() => {
    if (!playing || players.length === 0 || communalCards.length === 0) return null;

    // Evaluate all players' hands
    const evaluations = players
      .filter(p => p.hand && p.hand.length > 0)
      .map(player => ({
        player,
        evaluation: evaluateHand([...player.hand, ...communalCards])
      }));

    if (evaluations.length === 0) return null;

    // Find the best hand
    let best = evaluations[0];
    for (let i = 1; i < evaluations.length; i++) {
      const current = evaluations[i];
      // Compare ranks
      if (current.evaluation.rank > best.evaluation.rank) {
        best = current;
      } else if (current.evaluation.rank === best.evaluation.rank) {
        // Same rank, compare values
        for (let j = 0; j < Math.min(current.evaluation.values.length, best.evaluation.values.length); j++) {
          if (current.evaluation.values[j] > best.evaluation.values[j]) {
            best = current;
            break;
          } else if (current.evaluation.values[j] < best.evaluation.values[j]) {
            break;
          }
        }
      }
    }

    return {
      playerName: best.player.username,
      handRank: best.evaluation.rankName
    };
  }, [players, communalCards, playing]);

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
                {availableGames.length ? availableGames.map(game => (
                  <li key={game.id} className="flex items-center gap-2 mb-2">
                    <span>Game {game.code}</span>
                    <Button onClick={() => joinGame(game.id)}>Join Game</Button>
                    {user?.id === game.creatorId && (
                      <Button onClick={() => deleteGameFromLobby(game.id)}>Delete</Button>
                    )}
                  </li>
                )) : <Button onClick={createAndJoinGame}>Create New Game</Button>}
              </ul>
            </div>
          )}
        </div>
      )}

      {!showLobby && (
        <>
          <div id="controls">
            {showRestartButton && (
              <button id="restart" onClick={restart}>
                Restart
              </button>
            )}
          </div>

          {bestHandInfo && !winner && (
            <div id="best-hand" className="my-4 p-4 bg-blue-100 border-2 border-blue-500 rounded">
              <h3 className="text-lg font-bold">Best Hand: {bestHandInfo.playerName}</h3>
              <p className="text-md">{bestHandInfo.handRank}</p>
            </div>
          )}

          {winner && (
            <div id="winner" className="my-4 p-4 bg-green-100 border-2 border-green-500 rounded">
              {winner.isTie ? (
                <div>
                  <h3 className="text-xl font-bold">It&apos;s a Tie!</h3>
                  <p>Players: {winner.tiedPlayers?.join(', ')}</p>
                  <p>Hand: {winner.handRank}</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-xl font-bold">{winner.winnerName} Wins with a {winner.handRank}!</h3>
                </div>
              )}
              {players.length > 1 ? (
                <Button onClick={leaveGame} className="mt-4">
                    Leave Game
                </Button>
              ) : (
                <Button onClick={restart} className="mt-4">
                    Play Again
                </Button>
              )}
            </div>
          )}

          <PlayerList players={players} playing={playing} currentPlayerIndex={currentPlayerIndex} />
          <Pot />
          <CommunalCards />
        </>
      )}
    </div>
  );
}
