// app/ui/poker/player-controls.tsx

'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { usePlayers, useGameState, usePokerActions, useProcessing } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '../button';
import { useActionTimerCountdown } from '@/app/lib/hooks/use-action-timer-countdown';
import clsx from 'clsx';

function PlayerControls() {
  const { players } = usePlayers();
  const { playerBets, currentBet, actionTimer, currentPlayerIndex, stage } = useGameState();
  const { placeBet, fold, startTimer, clearTimer, setTurnTimerAction } = usePokerActions();
  const { user } = useUser();
  const { isActionProcessing, pendingAction } = useProcessing();

  // Note: currentBet represents the amount the current player needs to add to call

  // Determine if there's an active bet to call
  const hasBetToCall = currentBet !== undefined && currentBet > 0;
  // Determine if player can check (no bet to match, including when currentBet is undefined)
  const canCheck = currentBet === undefined || currentBet === 0;

  // Check if current user is the active player
  const isMyTurn = user && players[currentPlayerIndex]?.id === user.id;

  // Get current player's chip count
  const currentPlayer = isMyTurn ? players[currentPlayerIndex] : null;
  const playerChipCount = currentPlayer?.chips?.length || 0;

  // Set initial selected action based on game state
  const initialAction = canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet');
  const [selectedAction, setSelectedAction] = useState<'bet' | 'call' | 'raise' | 'fold' | 'check'>(initialAction);
  const [timerActive, setTimerActive] = useState(false);

  // Bet amount state - default to minimum bet or call amount
  const minBetAmount = hasBetToCall ? currentBet : 1;
  const [betAmount, setBetAmount] = useState(minBetAmount);

  // Use custom hook for countdown logic
  const isMyTimer = actionTimer?.targetPlayerId === user?.id;
  const countdown = useActionTimerCountdown(actionTimer, isMyTimer);

  // Debounce ref for action changes
  const actionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update selected action and bet amount when bet state or stage changes
  useEffect(() => {
    if (!timerActive) {
      setSelectedAction(canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet'));
      setBetAmount(hasBetToCall ? currentBet : 1);
    }
  }, [canCheck, hasBetToCall, timerActive, stage, currentBet]);

  // Always reset to default action and amount when stage changes (new betting round)
  useEffect(() => {
    const defaultAction = canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet');
    setSelectedAction(defaultAction);
    setBetAmount(hasBetToCall ? currentBet : 1);
  }, [stage, canCheck, hasBetToCall, currentBet]);

  // Sync timer state with actionTimer
  useEffect(() => {
    if (actionTimer && actionTimer.targetPlayerId === user?.id) {
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [actionTimer, user?.id]);

  // Helper to check if a specific action is processing
  const isProcessing = (actionType: 'bet' | 'call' | 'raise' | 'fold' | 'check') => {
    // Check action is treated as a bet action internally
    const normalizedType = actionType === 'check' ? 'bet' : actionType;
    return isActionProcessing && pendingAction?.type === normalizedType && pendingAction?.playerId === user?.id;
  };

  // Loading spinner component
  const Spinner = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const handleBetOrRaise = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    // Use the betAmount state
    placeBet(betAmount);
  };

  const handleCheck = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    // Check means betting 0 chips (staying in without adding chips)
    placeBet(0);
  };

  const incrementBet = () => {
    setBetAmount(prev => Math.min(prev + 1, playerChipCount));
  };

  const decrementBet = () => {
    setBetAmount(prev => Math.max(prev - 1, minBetAmount));
  };

  // Keyboard shortcuts for bet amount
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isMyTurn || isActionProcessing) return;

      if (e.key === 'ArrowUp' || e.key === '+') {
        e.preventDefault();
        setBetAmount(prev => Math.min(prev + 1, playerChipCount));
      } else if (e.key === 'ArrowDown' || e.key === '-') {
        e.preventDefault();
        setBetAmount(prev => Math.max(prev - 1, minBetAmount));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isMyTurn, isActionProcessing, playerChipCount, minBetAmount]);

  const handleAllIn = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    // Bet all remaining chips
    placeBet(playerChipCount);
  };

  const handleFold = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    fold();
  };

  const handleActionChange = (action: 'bet' | 'call' | 'raise' | 'fold' | 'check') => {
    setSelectedAction(action);

    // For bet/raise actions, set to current betAmount as the selected action
    // The actual action type will be determined by whether there's a bet to call
    const actionToSet = (action === 'bet' || action === 'raise')
      ? (hasBetToCall ? 'raise' : 'bet')
      : action;

    // Debounce the API call to avoid concurrent requests
    if (timerActive) {
      // Clear any pending timeout
      if (actionChangeTimeoutRef.current) {
        clearTimeout(actionChangeTimeoutRef.current);
      }

      // Set new timeout to update action after 200ms
      actionChangeTimeoutRef.current = setTimeout(async () => {
        try {
          // Send bet amount for bet/raise actions
          if (actionToSet === 'bet' || actionToSet === 'raise' || actionToSet === 'call') {
            await setTurnTimerAction(actionToSet, betAmount);
          } else {
            await setTurnTimerAction(actionToSet);
          }
        } catch (error) {
          console.error('Error setting timer action:', error);
        }
      }, 200);
    }
  };

  // Update timer action when bet amount changes (for bet/raise actions)
  useEffect(() => {
    if (timerActive && (selectedAction === 'bet' || selectedAction === 'raise' || selectedAction === 'call')) {
      // Clear any pending timeout
      if (actionChangeTimeoutRef.current) {
        clearTimeout(actionChangeTimeoutRef.current);
      }

      // Debounce the update
      actionChangeTimeoutRef.current = setTimeout(async () => {
        try {
          const actionToSet = selectedAction === 'call' || selectedAction === 'raise'
            ? (hasBetToCall ? 'raise' : 'bet')
            : 'bet';
          await setTurnTimerAction(actionToSet, betAmount);
        } catch (error) {
          console.error('Error updating timer bet amount:', error);
        }
      }, 200);
    }
  }, [betAmount, timerActive, selectedAction, hasBetToCall, setTurnTimerAction]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (actionChangeTimeoutRef.current) {
        clearTimeout(actionChangeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div id="playerControls" className='flex flex-col gap-2'>
      {/* Timer countdown display */}
      {timerActive && (
        <div className='text-center text-sm font-bold text-yellow-400'>
          Time remaining: {countdown}s
        </div>
      )}

      {/* Action Buttons with Radio Buttons - Vertical Layout */}
      <div className='flex flex-full flex-row items-center gap-2 justify-evenly'>
        {/* Check Button - disabled when there's a bet to call */}
        {canCheck && (
          <div className='flex flex-col items-center gap-2'>
            <input
              type="radio"
              id="radio-check"
              name="autoAction"
              value="check"
              checked={selectedAction === 'check'}
              onChange={() => handleActionChange('check')}
              disabled={isActionProcessing}
              className='w-4 h-4 cursor-pointer'
            />
            <Button
              size='sm'
              id="checkButton"
              onClick={handleCheck}
              disabled={isActionProcessing}
              className={`${selectedAction === 'check' ? 'ring-2 ring-yellow-400' : ''}`}
            >
              {isProcessing('check') && <Spinner />}
              <span className={isProcessing('check') ? 'ml-2' : ''}>Check</span>
            </Button>
          </div>
        )}

        {/* Bet/Raise Component with Amount Controls */}
        <div className='flex flex-1 flex-col items-center justify-stretch gap-2'>
            <input
              type="radio"
              id="radio-bet-raise"
              name="autoAction"
              value={hasBetToCall ? "raise" : "bet"}
              checked={selectedAction === 'bet' || selectedAction === 'call' || selectedAction === 'raise'}
              onChange={() => handleActionChange(hasBetToCall ? 'raise' : 'bet')}
              disabled={isActionProcessing}
              className='w-4 h-4 cursor-pointer'
            />
            <div className='flex flex-1 flex-row gap-2'>
                <div className='flex flex-1 flex-row gap-1 text-xs items-stretch'>
                    <Button
                        size='sm'
                        onClick={decrementBet}
                        disabled={isActionProcessing || betAmount <= minBetAmount}
                        className='text-white'
                    >
                        -
                    </Button>
                    <Button
                        size='sm'
                        id="betRaiseButton"
                        onClick={handleBetOrRaise}
                        disabled={isActionProcessing}
                        className={`flex-1 ${(selectedAction === 'bet' || selectedAction === 'call' || selectedAction === 'raise') ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                        {(isProcessing('bet') || isProcessing('call') || isProcessing('raise')) && <Spinner />}
                        <span className={clsx(
                            'flex flex-nowrap',
                            // {
                            //     'ml-2': (isProcessing('bet') || isProcessing('call') || isProcessing('raise')),
                            // },
                        )}>
                            {hasBetToCall
                                ? (betAmount === currentBet
                                    ? `Call (${betAmount * 10})`
                                    : `Raise (${betAmount * 10})`
                                )
                                : `Bet (${betAmount * 10})`
                            }
                        </span>
                    </Button>
                    <Button
                        size='sm'
                        onClick={incrementBet}
                        disabled={isActionProcessing || betAmount >= playerChipCount}
                        className='text-white'
                    >
                        +
                    </Button>
                </div>
            {/* Compact Amount Controls */}
                {/* <span className='px-2 text-center text-gray-300'>
                    (${betAmount * 10})
                </span> */}
                <Button
                    size='sm'
                    onClick={handleAllIn}
                    disabled={isActionProcessing || playerChipCount === betAmount}
                    className='bg-red-600 text-white'
                >
                    All In
                </Button>
            </div>
        </div>

        {/* Fold Button */}
        <div className='flex flex-col items-center gap-2'>
          <input
            type="radio"
            id="radio-fold"
            name="autoAction"
            value="fold"
            checked={selectedAction === 'fold'}
            onChange={() => handleActionChange('fold')}
            disabled={isActionProcessing}
            className='w-4 h-4 cursor-pointer'
          />
          <Button
            size='sm'
            id="foldButton"
            onClick={handleFold}
            disabled={isActionProcessing}
            className={`${selectedAction === 'fold' ? 'ring-2 ring-yellow-400' : ''}`}
          >
            {isProcessing('fold') && <Spinner />}
            <span className={isProcessing('fold') ? 'ml-2' : ''}>Fold</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(PlayerControls);
