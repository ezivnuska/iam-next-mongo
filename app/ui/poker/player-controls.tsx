// app/ui/poker/player-controls.tsx

'use client';

import { memo } from 'react';
import { usePlayers, useGameState, usePokerActions } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '../button';

function PlayerControls() {
  const { players } = usePlayers();
  const { playerBets, currentBet } = useGameState();
  const { placeBet, fold } = usePokerActions();
  const { user } = useUser();

  // Note: currentBet represents the amount the current player needs to add to call

  // Determine if there's an active bet to call
  const hasBetToCall = currentBet !== undefined && currentBet > 0;

  const handleBet = () => {
    // Bet minimum amount (1 chip)
    placeBet(1);
  };

  const handleCall = () => {
    // Match the current bet
    placeBet(currentBet);
  };

  const handleRaise = () => {
    // Call the current bet and raise by 1 chip
    const raiseAmount = currentBet + 1;
    placeBet(raiseAmount);
  };

  return (
    <div
      id="playerControls"
      className='flex flex-row items-center justify-center gap-1'
    >
      {!hasBetToCall ? (
        // No bet to call - show Bet option
        <Button id="betButton" onClick={handleBet}>
          Bet (1 chip)
        </Button>
      ) : (
        // There's a bet to call - show Call and Raise options
        <>
          <Button id="callButton" onClick={handleCall}>
            Call ({currentBet} chip{currentBet !== 1 ? 's' : ''})
          </Button>
          <Button id="raiseButton" onClick={handleRaise}>
            Raise ({currentBet + 1} chip{currentBet + 1 !== 1 ? 's' : ''})
          </Button>
        </>
      )}
      <Button id="foldButton" onClick={fold}>
        Fold
      </Button>
    </div>
  );
}

export default memo(PlayerControls);
