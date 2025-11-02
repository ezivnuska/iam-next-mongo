// app/ui/poker/poker-table.tsx

'use client';

import { usePlayers, useGameState, useViewers, usePokerActions } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import PlayerSlots from './player-slots';
import CommunalCards from './communal-cards';
import Pot from './pot';
import BestHand from './best-hand';
import PlayerActionArea from './player-action-area';
import ActionHistoryDisplay from './action-history-display';
import PokerLoading from './poker-loading';
import NotificationArea from './notification-area';
import { Button } from '@/app/ui/button';

export default function PokerTable() {
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

  return (
    <div id='poker-table' className='flex flex-1 flex-col sm:flex-row bg-green-700 gap-1 rounded-xl p-2'>
        <div className='flex flex-2 flex-col-reverse sm:flex-row gap-4'>
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
                <div className='flex flex-full'>
                    <NotificationArea />
                </div>
                {/* <div id='table' className='flex flex-3 flex-col items-stretch gap-2 bg-red-400'> */}
                <div className='flex flex-1 flex-row items-center justify-center'>
                    <CommunalCards />
                </div>
                {/* </div> */}
                <div className='flex flex-full'>
                    <PlayerActionArea />
                </div>
            </div>
        </div>
    </div>
  );
}
