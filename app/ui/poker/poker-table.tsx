// app/ui/poker/poker-table.tsx

'use client';

import { usePlayers, useGameState, useViewers, usePokerActions } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import PlayerSlots from './player-slots';
import CommunalCards from './communal-cards';
import Pot from './pot';
import BestHand from './best-hand';
import PlayerActionArea from './player-action-area';
import WinnerDisplay from './winner-display';
import ActionHistoryDisplay from './action-history-display';
import TimerStartButton from './timer-start-button';
import LockTimerNotification from './lock-timer-notification';
import GameNotification from './game-notification';
import PokerLoading from './poker-loading';
import RestartTimerToast from './restart-timer-toast';
import { Button } from '../button';

export default function PokerTable() {
  const { players } = usePlayers();
  const { stage, stages, locked, currentPlayerIndex, winner, communalCards, isLoading, restartCountdown, gameNotification } = useGameState();
  const { gameId, availableGames } = useViewers();
  const { joinGame, restart, leaveGame, deleteGameFromLobby } = usePokerActions();
  const { user } = useUser();

  // Show loading screen while initial data is being fetched
  if (isLoading) {
    return null;
    // return <PokerLoading />;
  }

  const isUserInGame = user?.username && players.some(p => p.username === user.username);

  return (
    <div id='poker-table' className='flex flex-1 flex-col sm:flex-row bg-green-700 gap-1 rounded-xl p-2'>
        <GameNotification notification={gameNotification} />
        <div className='flex flex-2 flex-col-reverse sm:flex-row gap-4 p-1'>
            <div id='players' className='flex'>
                <PlayerSlots
                    players={players}
                    locked={locked}
                    currentPlayerIndex={currentPlayerIndex}
                    currentUserId={user?.id}
                    gameId={gameId}
                    onJoinGame={() => gameId && joinGame(gameId)}
                    onLeaveGame={leaveGame}
                />
            </div>
            <div id='pot' className='flex flex-row items-center justify-center gap-4'>
                <Pot />
            </div>
            <div className='flex flex-3 flex-col items-stretch'>
                    <RestartTimerToast />
                    <LockTimerNotification />
                {/* </div> */}
                <div id='table' className='flex flex-1 flex-col items-stretch gap-2'>
                    <div className='flex flex-1 flex-row items-center justify-center'>
                        <CommunalCards />
                    </div>
                    <PlayerActionArea />
                </div>
            </div>
        </div>
    </div>
  );
}
