// app/ui/poker/player-controls.tsx

'use client';

import { memo } from 'react';
import { usePlayers, useGameState, usePokerActions, useProcessing } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '../button';

function PlayerControls() {
  const { players } = usePlayers();
  const { playerBets, currentBet } = useGameState();
  const { placeBet, fold } = usePokerActions();
  const { user } = useUser();
  const { isActionProcessing, pendingAction } = useProcessing();

  // Note: currentBet represents the amount the current player needs to add to call

  // Determine if there's an active bet to call
  const hasBetToCall = currentBet !== undefined && currentBet > 0;

  // Helper to check if a specific action is processing
  const isProcessing = (actionType: 'bet' | 'call' | 'raise' | 'fold') => {
    return isActionProcessing && pendingAction?.type === actionType && pendingAction?.playerId === user?.id;
  };

  // Loading spinner component
  const Spinner = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

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
      className='flex flex-row items-stretch justify-evenly gap-1'
    >
      {!hasBetToCall ? (
        // No bet to call - show Bet option
        <Button size='md' id="betButton" onClick={handleBet} disabled={isActionProcessing}>
            {isProcessing('bet') && <Spinner />}
            <span className={isProcessing('bet') ? 'ml-2' : ''}>Bet (10)</span>
        </Button>
      ) : (
        // There's a bet to call - show Call and Raise options
          <Button size='md' id="callButton" onClick={handleCall} disabled={isActionProcessing}>
            {isProcessing('call') && <Spinner />}
            <span className={isProcessing('call') ? 'ml-2' : ''}>Call ({currentBet * 10})</span>
          </Button>
      )}
      <Button size='md' id="raiseButton" onClick={handleRaise} disabled={isActionProcessing}>
          {isProcessing('raise') && <Spinner />}
          <span className={isProcessing('raise') ? 'ml-2' : ''}>Raise ({(currentBet + 1) * 10})</span>
      </Button>
      <Button size='md' id="foldButton" onClick={fold} disabled={isActionProcessing}>
        {isProcessing('fold') && <Spinner />}
        <span className={isProcessing('fold') ? 'ml-2' : ''}>Fold</span>
      </Button>
    </div>
  );
}

export default memo(PlayerControls);
