// app/ui/poker/player-controls.tsx

'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { usePlayers, useGameState, usePokerActions, useProcessing } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '../button';

function PlayerControls() {
  const { players } = usePlayers();
  const { playerBets, currentBet, actionTimer, currentPlayerIndex } = useGameState();
  const { placeBet, fold, startTimer, clearTimer, setTurnTimerAction } = usePokerActions();
  const { user } = useUser();
  const { isActionProcessing, pendingAction } = useProcessing();

  // Note: currentBet represents the amount the current player needs to add to call

  // Determine if there's an active bet to call
  const hasBetToCall = currentBet !== undefined && currentBet > 0;

  // Check if current user is the active player
  const isMyTurn = user && players[currentPlayerIndex]?.id === user.id;

  // Set initial selected action based on game state
  const initialAction = hasBetToCall ? 'call' : 'bet';
  const [selectedAction, setSelectedAction] = useState<'bet' | 'call' | 'raise' | 'fold'>(initialAction);
  const [timerActive, setTimerActive] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);

  // Debounce ref for action changes
  const actionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update selected action when bet state changes
  useEffect(() => {
    if (!timerActive) {
      setSelectedAction(hasBetToCall ? 'call' : 'bet');
    }
  }, [hasBetToCall, timerActive]);

  // Sync timer state with actionTimer
  useEffect(() => {
    if (actionTimer && actionTimer.targetPlayerId === user?.id) {
      setTimerActive(true);
      // Calculate remaining time
      const startTime = new Date(actionTimer.startTime).getTime();
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, actionTimer.duration - elapsed);
      setCountdown(Math.ceil(remaining));
    } else {
      setTimerActive(false);
      setCountdown(0);
    }
  }, [actionTimer, user?.id]);

  // Auto-start timer when it's the player's turn
  useEffect(() => {
    const autoStartTimer = async () => {
      if (isMyTurn && !timerActive && !actionTimer) {
        try {
          await startTimer();
          // Small delay to ensure timer is set before updating action
          setTimeout(async () => {
            try {
              await setTurnTimerAction(selectedAction);
            } catch (error) {
              console.error('Error setting initial timer action:', error);
            }
          }, 100);
        } catch (error) {
          console.error('Error starting timer:', error);
        }
      }
    };
    autoStartTimer();
  }, [isMyTurn, timerActive, actionTimer]);

  // Countdown effect
  useEffect(() => {
    if (!timerActive || countdown <= 0) return;

    const interval = setInterval(() => {
      if (actionTimer) {
        const startTime = new Date(actionTimer.startTime).getTime();
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, actionTimer.duration - elapsed);
        setCountdown(Math.ceil(remaining));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerActive, actionTimer, countdown]);

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

  const handleBet = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    // Bet minimum amount (1 chip)
    placeBet(1);
  };

  const handleCall = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    // Match the current bet
    placeBet(currentBet);
  };

  const handleRaise = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    // Call the current bet and raise by 1 chip
    const raiseAmount = currentBet + 1;
    placeBet(raiseAmount);
  };

  const handleFold = async () => {
    // Clear timer if active
    if (timerActive) {
      await clearTimer();
    }
    fold();
  };

  const handleActionChange = (action: 'bet' | 'call' | 'raise' | 'fold') => {
    setSelectedAction(action);

    // Debounce the API call to avoid concurrent requests
    if (timerActive) {
      // Clear any pending timeout
      if (actionChangeTimeoutRef.current) {
        clearTimeout(actionChangeTimeoutRef.current);
      }

      // Set new timeout to update action after 200ms
      actionChangeTimeoutRef.current = setTimeout(async () => {
        try {
          await setTurnTimerAction(action);
        } catch (error) {
          console.error('Error setting timer action:', error);
        }
      }, 200);
    }
  };

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

      {/* Action Buttons with Radio Buttons - Horizontal Layout */}
      <div className='flex flex-row items-center justify-evenly gap-1'>
        {!hasBetToCall ? (
          // No bet to call - show Bet option
          <div className='flex flex-col items-center gap-1'>
            <input
              type="radio"
              id="radio-bet"
              name="autoAction"
              value="bet"
              checked={selectedAction === 'bet'}
              onChange={() => handleActionChange('bet')}
              disabled={isActionProcessing}
              className='w-4 h-4 cursor-pointer'
            />
            <Button
              size='md'
              id="betButton"
              onClick={handleBet}
              disabled={isActionProcessing}
              className={selectedAction === 'bet' ? 'ring-2 ring-yellow-400' : ''}
            >
              {isProcessing('bet') && <Spinner />}
              <span className={isProcessing('bet') ? 'ml-2' : ''}>Bet (10)</span>
            </Button>
          </div>
        ) : (
          // There's a bet to call - show Call option
          <div className='flex flex-col items-center gap-1'>
            <input
              type="radio"
              id="radio-call"
              name="autoAction"
              value="call"
              checked={selectedAction === 'call'}
              onChange={() => handleActionChange('call')}
              disabled={isActionProcessing}
              className='w-4 h-4 cursor-pointer'
            />
            <Button
              size='md'
              id="callButton"
              onClick={handleCall}
              disabled={isActionProcessing}
              className={selectedAction === 'call' ? 'ring-2 ring-yellow-400' : ''}
            >
              {isProcessing('call') && <Spinner />}
              <span className={isProcessing('call') ? 'ml-2' : ''}>Call ({currentBet * 10})</span>
            </Button>
          </div>
        )}

        <div className='flex flex-col items-center gap-1'>
          <input
            type="radio"
            id="radio-raise"
            name="autoAction"
            value="raise"
            checked={selectedAction === 'raise'}
            onChange={() => handleActionChange('raise')}
            disabled={isActionProcessing}
            className='w-4 h-4 cursor-pointer'
          />
          <Button
            size='md'
            id="raiseButton"
            onClick={handleRaise}
            disabled={isActionProcessing}
            className={selectedAction === 'raise' ? 'ring-2 ring-yellow-400' : ''}
          >
            {isProcessing('raise') && <Spinner />}
            <span className={isProcessing('raise') ? 'ml-2' : ''}>Raise ({(currentBet + 1) * 10})</span>
          </Button>
        </div>

        <div className='flex flex-col items-center gap-1'>
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
            size='md'
            id="foldButton"
            onClick={handleFold}
            disabled={isActionProcessing}
            className={selectedAction === 'fold' ? 'ring-2 ring-yellow-400' : ''}
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
