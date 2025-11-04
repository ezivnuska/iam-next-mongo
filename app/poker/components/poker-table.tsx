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
// import CurrentUserPlayer from './current-user-player';
import PlayerUser from './player-user';
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
  const currentUserPlayer = players.find(p => p.id === user?.id);
  const currentUserPlayerIndex = players.findIndex(p => p.id === user?.id);
  const isUserTurn = currentUserPlayerIndex === currentPlayerIndex;

  return (
    <div id='poker-table' className='flex flex-1 flex-col sm:flex-row bg-green-700 gap-1 rounded-xl p-2'>
        {/* <div className='flex flex-2 flex-col-reverse sm:flex-row gap-4 sm:px-2'> */}
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
            <div className='flex flex-3 flex-col items-stretch'>
                <div className='flex flex-1 flex-col items-stretch'>

                    {/* Current user's player display with controls */}
                    {currentUserPlayer && (
                        <PlayerUser
                            player={currentUserPlayer}
                            index={currentUserPlayerIndex}
                            locked={locked}
                            currentPlayerIndex={currentPlayerIndex}
                            potContribution={0}
                            isCurrentUser={true}
                            totalPlayers={players.length}
                            isUserTurn={isUserTurn}
                            onLeaveGame={leaveGame}
                        />
                    )}
                </div>
                <div className='flex flex-1 w-full flex-col sm:flex-row items-center justify-evenly'>
                    <div className='flex m-2'>
                        <Pot />
                    </div>
                    <div className='flex flex-1 items-center justify-center'>
                        <CommunalCards />
                    </div>
                </div>
            </div>
        {/* </div> */}
    </div>
  );
}
