// app/ui/poker/player-controls.tsx

'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { usePlayers, useGameState, usePokerActions, useProcessing } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '@/app/ui/button';
import clsx from 'clsx';
import { getChipTotal } from '@/app/poker/lib/utils/poker';

interface PlayerControlsProps {
  onActionTaken?: () => void;
}

function PlayerControls({ onActionTaken }: PlayerControlsProps = {}) {
  const { players } = usePlayers();
  const { playerBets, currentBet, actionTimer, currentPlayerIndex, stage } = useGameState();
  const { placeBet, fold, setTurnTimerAction, clearTimerOptimistically, playSound } = usePokerActions();
  const { user } = useUser();
  const { isActionProcessing, pendingAction } = useProcessing();

  // Note: currentBet represents the amount the current player needs to add to call

  // Determine if there's an active bet to call
  const hasBetToCall = currentBet !== undefined && currentBet > 0;
  // Determine if player can check (no bet to match, including when currentBet is undefined)
  const canCheck = currentBet === undefined || currentBet === 0;

  // Check if current user is the active player
  const isMyTurn = user && players[currentPlayerIndex]?.id === user.id;

  // Get current player's chip count and all-in status
  const currentPlayer = isMyTurn ? players[currentPlayerIndex] : null;
  const playerChipCount = currentPlayer ? getChipTotal(currentPlayer.chips) : 0;
  const isPlayerAllIn = currentPlayer?.isAllIn || false;

  // Check if calling the current bet would be an all-in (hide separate All-In button)
  const callingIsAllIn = hasBetToCall && currentBet >= playerChipCount;

  // Set initial selected action based on game state
  const initialAction = canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet');
  const [selectedAction, setSelectedAction] = useState<'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allin'>(initialAction);
  const [timerActive, setTimerActive] = useState(false);

  // Bet amount state - default to minimum bet or call amount
  const minBetAmount = hasBetToCall ? currentBet : 1;
  const [betAmount, setBetAmount] = useState(minBetAmount);

  // Debounce ref for action changes
  const actionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update selected action and bet amount when bet state or stage changes
  useEffect(() => {
    if (!timerActive) {
      const newBetAmount = hasBetToCall ? currentBet : 1;
      console.log('[PlayerControls] Bet state changed - hasBetToCall:', hasBetToCall, 'currentBet:', currentBet, 'newBetAmount:', newBetAmount);
      setSelectedAction(canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet'));
      setBetAmount(newBetAmount);
    }
  }, [canCheck, hasBetToCall, timerActive, stage, currentBet]);

  // Always reset to default action and amount when stage changes (new betting round)
  useEffect(() => {
    const defaultAction = canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet');
    const newBetAmount = hasBetToCall ? currentBet : 1;
    console.log('[PlayerControls] Stage changed - stage:', stage, 'hasBetToCall:', hasBetToCall, 'currentBet:', currentBet, 'newBetAmount:', newBetAmount);
    setSelectedAction(defaultAction);
    setBetAmount(newBetAmount);
  }, [stage, canCheck, hasBetToCall, currentBet]);

  // Sync timer state with actionTimer
  useEffect(() => {
    if (actionTimer && actionTimer.targetPlayerId === user?.id) {
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [actionTimer, user?.id]);

  // Single consolidated effect to update timer action
  // This replaces the previous separate effects to prevent race conditions
  useEffect(() => {
    // Only update if timer is active
    if (!timerActive) {
      return;
    }

    // Determine the actual action type to send to server
    let actionToSet: 'bet' | 'call' | 'raise' | 'fold' | 'check';
    if (selectedAction === 'allin') {
      actionToSet = 'bet';
    } else if (selectedAction === 'bet' || selectedAction === 'raise') {
      if (hasBetToCall) {
        // If betAmount equals currentBet, it's a call; otherwise it's a raise
        actionToSet = betAmount === currentBet ? 'call' : 'raise';
      } else {
        actionToSet = 'bet';
      }
    } else {
      actionToSet = selectedAction;
    }

    // Clear any pending timeout to prevent race conditions
    if (actionChangeTimeoutRef.current) {
      clearTimeout(actionChangeTimeoutRef.current);
    }

    // Debounce the update to avoid concurrent requests
    actionChangeTimeoutRef.current = setTimeout(async () => {
      try {
        // Send with bet amount if applicable
        if (actionToSet === 'bet' || actionToSet === 'raise' || actionToSet === 'call') {
          const amountToSend = selectedAction === 'allin' ? playerChipCount : betAmount;
          await setTurnTimerAction(actionToSet, amountToSend);
        } else {
          await setTurnTimerAction(actionToSet);
        }
      } catch (err) {
        console.error('Error updating timer action:', err);
      }
    }, 300); // Increased debounce to 300ms for better reliability

    return () => {
      if (actionChangeTimeoutRef.current) {
        clearTimeout(actionChangeTimeoutRef.current);
      }
    };
  }, [timerActive, selectedAction, hasBetToCall, betAmount, currentBet, playerChipCount, setTurnTimerAction]);

  // Helper to check if a specific action is processing
  const isProcessing = (actionType: 'bet' | 'call' | 'raise' | 'fold' | 'check') => {
    // Check action is treated as a bet action internally
    const normalizedType = actionType === 'check' ? 'bet' : actionType;
    return isActionProcessing && pendingAction?.type === normalizedType && pendingAction?.playerId === user?.id;
  };

  // Loading spinner component
//   const Spinner = () => (
//     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//     </svg>
//   );

  const handleBetOrRaise = async () => {
    // Notify parent immediately that action was taken
    onActionTaken?.();
    // Clear timer optimistically for instant UI feedback
    clearTimerOptimistically();

    // Play appropriate sound optimistically for instant feedback
    // - Call: matching the current bet
    // - Raise: betting more than current bet OR initial bet when no bet exists
    const soundToPlay = hasBetToCall
      ? (betAmount === currentBet ? 'call' : 'raise')
      : 'raise';
    playSound(soundToPlay);

    console.log('[PlayerControls] Bet/Raise - betAmount:', betAmount, 'currentBet:', currentBet, 'hasBetToCall:', hasBetToCall);
    // Timer will be automatically cleared by server on bet placement
    // Use the betAmount state
    placeBet(betAmount);
  };

  const handleCheck = async () => {
    // Notify parent immediately that action was taken
    onActionTaken?.();
    // Clear timer optimistically for instant UI feedback
    clearTimerOptimistically();
    // Play sound optimistically for instant feedback
    playSound('check');
    // Timer will be automatically cleared by server on bet placement
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
    // Notify parent immediately that action was taken
    onActionTaken?.();
    // Clear timer optimistically for instant UI feedback
    clearTimerOptimistically();
    // Play sound optimistically for instant feedback
    // All-in is always a raise (aggressive action)
    playSound('raise');
    // Timer will be automatically cleared by server on bet placement
    // Bet all remaining chips
    placeBet(playerChipCount);
  };

  const handleFold = async () => {
    // Notify parent immediately that action was taken
    onActionTaken?.();
    // Clear timer optimistically for instant UI feedback
    clearTimerOptimistically();
    // Play sound optimistically for instant feedback
    playSound('fold');
    // Timer will be automatically cleared by server on fold action
    fold();
  };

  const handleActionChange = (action: 'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allin') => {
    // Just update local state - the consolidated useEffect will handle the API call
    setSelectedAction(action);
  };

  return (
    <div id="playerControls" className='flex flex-1 flex-col gap-2 overflow-hidden rounded-lg p-2'>
      {/* Action Buttons with Radio Buttons - Vertical Layout */}
      <div className='flex flex-full flex-row items-center gap-2 justify-between'>
        {/* Check Button - disabled when there's a bet to call */}
        {canCheck && (
          <div className='flex flex-col-reverse sm:flex-row items-center gap-2'>
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
              <span>Check</span>
            </Button>
          </div>
        )}

        {/* Bet/Raise Component with Amount Controls */}
        <div className='flex flex-col-reverse sm:flex-row items-center justify-stretch gap-2'>
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
            <div className={`flex flex-1 flex-row items-stretch rounded-lg overflow-hidden bg-blue-500 ${(selectedAction === 'bet' || selectedAction === 'call' || selectedAction === 'raise') ? 'ring-2 ring-yellow-400' : ''}`}>
                {/* Hide increment/decrement buttons when player is all-in */}
                {!isPlayerAllIn && (
                    <button
                        onClick={decrementBet}
                        disabled={isActionProcessing || betAmount <= minBetAmount}
                        className='text-white h-8 px-2 text-md'
                    >
                        -
                    </button>
                )}
                <button
                    id="betRaiseButton"
                    onClick={handleBetOrRaise}
                    disabled={isActionProcessing}
                    className='flex-1 h-8 px-1 text-md'
                >
                    <span className='flex flex-nowrap text-white px-2'>
                        {hasBetToCall
                            ? (betAmount === currentBet
                                ? `Call ${betAmount}`
                                : `Raise ${betAmount}`
                            )
                            : `Bet ${betAmount}`
                        }
                    </span>
                </button>
                {/* Hide increment/decrement buttons when player is all-in */}
                {!isPlayerAllIn && (
                    <button
                        onClick={incrementBet}
                        disabled={isActionProcessing || betAmount >= playerChipCount}
                        className='text-white h-8 px-2 text-md'
                    >
                        +
                    </button>
                )}
            </div>
        </div>

        {/* All In Button - hidden when player is already all-in or when calling would be an all-in */}
        {!isPlayerAllIn && !callingIsAllIn && (
          <div className='flex flex-col-reverse sm:flex-row items-center gap-2'>
            <input
              type="radio"
              id="radio-allin"
              name="autoAction"
              value="allin"
              checked={selectedAction === 'allin'}
              onChange={() => handleActionChange('allin')}
              disabled={isActionProcessing}
              className='w-4 h-4 cursor-pointer'
            />
            <Button
              size='sm'
              id="allinButton"
              onClick={handleAllIn}
              disabled={isActionProcessing}
              className={`bg-red-600 text-white ${selectedAction === 'allin' ? 'ring-2 ring-yellow-400' : ''}`}
            >
              <span>All In</span>
            </Button>
          </div>
        )}

        {/* Fold Button */}
        <div className='flex flex-col-reverse sm:flex-row items-center gap-2'>
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
            <span>Fold</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(PlayerControls);
