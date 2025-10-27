// app/ui/poker/poker.tsx

'use client';

import { usePlayers, useGameState, useViewers, usePokerActions } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import PlayerSlots from './player-slots';
import CommunalCards from './communal-cards';
import Pot from './pot';
import BestHand from './best-hand';
import PlayerControls from './player-controls';
import WinnerDisplay from './winner-display';
import ActionHistoryDisplay from './action-history-display';
import TimerStartButton from './timer-start-button';
import LockTimerNotification from './lock-timer-notification';
import GameActionStatus from './game-action-status';
import PokerLoading from './poker-loading';
import { Button } from '../button';

export default function Poker() {
  const { players } = usePlayers();
  const { stage, stages, locked, currentPlayerIndex, winner, communalCards, isLoading, restartCountdown } = useGameState();
  const { gameId, availableGames } = useViewers();
  const { joinGame, restart, leaveGame, deleteGameFromLobby } = usePokerActions();
  const { user } = useUser();

  // Show loading screen while initial data is being fetched
  if (isLoading) {
    return null;
    // return <PokerLoading />;
  }

  const isUserInGame = user?.username && players.some(p => p.username === user.username);
  const canDeal = players.length > 1;
  const showDealButton = canDeal && stage < stages.length;
  const showRestartButton = stage === stages.length;
  const showLobby = !gameId || !isUserInGame;

  const currentPlayer = players[currentPlayerIndex];
  const isCurrentUserTurn = user?.id === currentPlayer?.id;
  // Show controls when game is locked (in progress)
  const showPlayerControls = locked && !winner && isCurrentUserTurn && isUserInGame;

  // Show manual restart button when:
  // - Game has ended (winner exists)
  // - At least 2 players remain
  // - Auto-restart is cancelled (no countdown - winner has left)
  const showManualRestart = winner && players.length >= 2 && !restartCountdown;

  return (
    <div id="game" className='flex flex-row gap-4'>
        <div className='flex flex-1 flex-col gap-4 p-2'>
            <LockTimerNotification />
            <GameActionStatus />
            <div className='flex flex-row items-center justiify-between gap-4'>
                {!winner && <Pot />}
                <div className='flex items-end'>
                    {locked ? (
                        <BestHand players={players} communalCards={communalCards} locked={locked} />
                    ) : winner && (
                        <WinnerDisplay winner={winner} />
                    )}
                </div>
            </div>

            {showPlayerControls && <PlayerControls />}

            {showManualRestart && (
              <div className="w-full max-w-2xl mx-auto mb-4">
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-yellow-900 font-semibold">
                      Winner has left. Ready to continue?
                    </p>
                    <Button
                      onClick={restart}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      Restart Game
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <TimerStartButton />

            <div className='flex flex-col gap-4 items-center justify-center'>
                <PlayerSlots
                    players={players}
                    locked={locked}
                    currentPlayerIndex={currentPlayerIndex}
                    currentUserId={user?.id}
                    gameId={gameId}
                    onJoinGame={() => gameId && joinGame(gameId)}
                    onLeaveGame={leaveGame}
                />
                <CommunalCards />
            </div>
            <ActionHistoryDisplay />
        </div>
    </div>
  );
}
