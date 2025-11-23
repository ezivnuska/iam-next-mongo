// app/ui/poker/player-controls.tsx

'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { usePlayers, useGameState, usePokerActions, useProcessing } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '@/app/ui/button';
import clsx from 'clsx';
import { UnifiedBetControl } from './unified-bet-control';

interface PlayerControlsProps {
  onActionTaken?: () => void;
}

function PlayerControls({ onActionTaken }: PlayerControlsProps = {}) {
  const { players } = usePlayers();
  const { playerBets, currentBet, actionTimer, currentPlayerIndex, stage, canPlayerAct } = useGameState();
  const { placeBet, fold, setTurnTimerAction, clearTimerOptimistically, playSound } = usePokerActions();
  const { user } = useUser();
  const { isActionProcessing, pendingAction } = useProcessing();

  // Note: currentBet represents the amount the current player needs to add to call

  // Determine if there's an active bet to call
  const hasBetToCall = currentBet !== undefined && currentBet > 0;
  // Determine if player can check (no bet to match, including when currentBet is undefined)
  const canCheck = currentBet === undefined || currentBet === 0;

  // Check if current user is the active player (for getting player data)
  const isMyTurn = user && players[currentPlayerIndex]?.id === user.id;

  // Get current player's chip count and all-in status
  const currentPlayer = isMyTurn ? players[currentPlayerIndex] : null;
  const playerChipCount = currentPlayer ? currentPlayer.chipCount : 0;
  const isPlayerAllIn = currentPlayer?.isAllIn || false;

  // Check if calling the current bet would be an all-in (hide separate All-In button)
  const callingIsAllIn = hasBetToCall && currentBet >= playerChipCount;

  // Set initial selected action based on game state
  const initialAction = canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet');
  const [selectedAction, setSelectedAction] = useState<'bet' | 'call' | 'raise' | 'fold' | 'check'>(initialAction);
  const [timerActive, setTimerActive] = useState(false);

  // Bet amount state - default to 0 if can check, otherwise minimum bet or call amount
  // Cap call amount at player's available chips (for all-in scenarios)
  const minBetAmount = hasBetToCall ? Math.min(currentBet, playerChipCount) : 0;
  const initialBetAmount = canCheck ? 0 : minBetAmount;
  const [betAmount, setBetAmount] = useState(initialBetAmount);

  // Debounce ref for action changes
  const actionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update selected action and bet amount when bet state or stage changes
  useEffect(() => {
    if (!timerActive) {
      // Default to 0 if can check, otherwise minimum bet or call amount
      const newBetAmount = canCheck ? 0 : (hasBetToCall ? Math.min(currentBet, playerChipCount) : 0);
      setSelectedAction(canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet'));
      setBetAmount(newBetAmount);
    }
  }, [canCheck, hasBetToCall, timerActive, stage, currentBet, playerChipCount]);

  // Always reset to default action and amount when stage changes (new betting round)
  useEffect(() => {
    const defaultAction = canCheck ? 'check' : (hasBetToCall ? 'call' : 'bet');
    // Default to 0 if can check, otherwise minimum bet or call amount
    const newBetAmount = canCheck ? 0 : (hasBetToCall ? Math.min(currentBet, playerChipCount) : 0);
    setSelectedAction(defaultAction);
    setBetAmount(newBetAmount);
  }, [stage, canCheck, hasBetToCall, currentBet, playerChipCount]);

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
    if (selectedAction === 'bet' || selectedAction === 'raise') {
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
          await setTurnTimerAction(actionToSet, betAmount);
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

  // Unified handler for check/call/bet/raise actions
  const handleUnifiedBetAction = async () => {
    // Notify parent immediately that action was taken
    onActionTaken?.();
    // Clear timer optimistically for instant UI feedback
    clearTimerOptimistically();

    // Determine action type and play appropriate sound
    let soundToPlay: 'check' | 'call' | 'raise' | 'fold' = 'check';

    if (betAmount === 0 && canCheck) {
      soundToPlay = 'check';
    } else if (hasBetToCall) {
      soundToPlay = betAmount === currentBet ? 'call' : 'raise';
    } else if (betAmount > 0) {
      soundToPlay = 'raise'; // Initial bet is like a raise
    }

    playSound(soundToPlay);


    // Execute the bet
    placeBet(betAmount);
  };

  // Handler to update bet amount from child component
  const handleBetAmountChange = (newAmount: number) => {
    setBetAmount(newAmount);

    // Update selected action based on new amount
    if (newAmount === 0 && canCheck) {
      setSelectedAction('check');
    } else if (hasBetToCall) {
      setSelectedAction(newAmount === currentBet ? 'call' : 'raise');
    } else {
      setSelectedAction('bet');
    }
  };

  // Keyboard shortcuts for bet amount
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only allow keyboard input when player can actually act (turn + notifications complete)
      if (!canPlayerAct || isActionProcessing) return;

      const minBet = hasBetToCall ? Math.min(currentBet, playerChipCount) : 0;

      if (e.key === 'ArrowUp' || e.key === '+') {
        e.preventDefault();
        const newAmount = Math.min(betAmount + 1, playerChipCount);
        handleBetAmountChange(newAmount);
      } else if (e.key === 'ArrowDown' || e.key === '-') {
        e.preventDefault();
        const newAmount = Math.max(betAmount - 1, minBet);
        handleBetAmountChange(newAmount);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canPlayerAct, isActionProcessing, playerChipCount, hasBetToCall, currentBet, betAmount]);

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

  const handleActionChange = (action: 'bet' | 'call' | 'raise' | 'fold' | 'check') => {
    // Just update local state - the consolidated useEffect will handle the API call
    setSelectedAction(action);
  };

  return (
    <div id="playerControls" className='flex h-full w-full flex-row self-center items-center justify-center bg-green-900 rounded-full'>
      {/* Action Buttons with Radio Buttons - Vertical Layout */}
      <div className='flex flex-1 flex-row items-center gap-2 justify-center'>
        {/* Unified Bet Control - Handles Check/Call/Bet/Raise */}
        <div className='flex flex-row items-center gap-2'>
          <input
            type="radio"
            id="radio-bet"
            name="autoAction"
            value="bet"
            checked={selectedAction === 'bet' || selectedAction === 'call' || selectedAction === 'raise' || selectedAction === 'check'}
            onChange={() => {
              // Determine appropriate action based on state
              if (canCheck && betAmount === 0) {
                handleActionChange('check');
              } else if (hasBetToCall) {
                handleActionChange(betAmount === currentBet ? 'call' : 'raise');
              } else {
                handleActionChange('bet');
              }
            }}
            disabled={isActionProcessing}
            className='w-4 h-4 cursor-pointer'
          />
          <UnifiedBetControl
            betAmount={betAmount}
            currentBet={currentBet}
            playerChipCount={playerChipCount}
            hasBetToCall={hasBetToCall}
            canCheck={canCheck}
            isProcessing={isActionProcessing}
            isPlayerAllIn={isPlayerAllIn}
            onBetAmountChange={handleBetAmountChange}
            onExecuteAction={handleUnifiedBetAction}
            isSelected={selectedAction === 'bet' || selectedAction === 'call' || selectedAction === 'raise' || selectedAction === 'check'}
          />
        </div>

        {/* All In Button - hidden when player is already all-in or when calling would be an all-in */}
        {!isPlayerAllIn && !callingIsAllIn && (
          <Button
            size='sm'
            id="allinButton"
            onClick={handleAllIn}
            disabled={isActionProcessing}
            className='bg-red-600 text-white rounded-full px-3'
          >
            <span>All In</span>
          </Button>
        )}

        {/* Fold Button */}
        <div className='flex flex-row items-center gap-2'>
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
            className={clsx('rounded-full px-3',
                {
                    'ring-2 ring-yellow-400': selectedAction === 'fold',
                }
            )}
          >
            <span>Fold</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(PlayerControls);
