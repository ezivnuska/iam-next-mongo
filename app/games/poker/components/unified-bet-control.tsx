// app/poker/components/unified-bet-control.tsx

'use client';

import { ChevronUpIcon, ChevronDownIcon } from '@/app/ui/icons';

interface UnifiedBetControlProps {
  betAmount: number;
  currentBet: number;
  playerChipCount: number;
  hasBetToCall: boolean;
  canCheck: boolean;
  isProcessing: boolean;
  isPlayerAllIn: boolean;
  onBetAmountChange: (amount: number) => void;
  onExecuteAction: () => void;
  isSelected: boolean;
}

export function UnifiedBetControl({
  betAmount,
  currentBet,
  playerChipCount,
  hasBetToCall,
  canCheck,
  isProcessing,
  isPlayerAllIn,
  onBetAmountChange,
  onExecuteAction,
  isSelected,
}: UnifiedBetControlProps) {
  // Determine the label based on bet amount and game state
  const getLabel = () => {
    // If no bet amount and can check
    if (betAmount === 0 && canCheck) {
      return 'Check';
    }

    // If there's a bet to call
    if (hasBetToCall) {
      // If betting exactly the call amount
      if (betAmount === currentBet) {
        return `Call ${betAmount}`;
      }
      // If betting more than call amount
      return `Raise ${betAmount}`;
    }

    // If no bet to call, this is an initial bet
    if (betAmount > 0) {
      return `Bet ${betAmount}`;
    }

    // Default to Check
    return 'Check';
  };

  // Calculate minimum bet amount
  const minBetAmount = hasBetToCall ? Math.min(currentBet, playerChipCount) : 0;

  const handleIncrement = () => {
    const newAmount = Math.min(betAmount + 1, playerChipCount);
    onBetAmountChange(newAmount);
  };

  const handleDecrement = () => {
    const newAmount = Math.max(betAmount - 1, minBetAmount);
    onBetAmountChange(newAmount);
  };

  const canIncrement = betAmount < playerChipCount && !isPlayerAllIn;
  const canDecrement = betAmount > minBetAmount && !isPlayerAllIn;

  return (
    <div
      className={`flex flex-1 flex-row items-stretch rounded-full overflow-hidden bg-blue-600 hover:bg-blue-700 transition-colors ${
        isSelected ? 'ring-2 ring-yellow-400' : ''
      }`}
    >
      {/* Decrement Button */}
      {!isPlayerAllIn && (
        <button
          onClick={handleDecrement}
          disabled={isProcessing || !canDecrement}
          className="flex items-center justify-center text-white h-8 pl-3 pr-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-800 transition-colors"
          aria-label="Decrease bet amount"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      )}

      {/* Main Action Button */}
      <button
        id="unifiedBetButton"
        onClick={onExecuteAction}
        disabled={isProcessing}
        className="flex-1 h-8 px-2 text-white text-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="whitespace-nowrap">{getLabel()}</span>
      </button>

      {/* Increment Button */}
      {!isPlayerAllIn && (
        <button
          onClick={handleIncrement}
          disabled={isProcessing || !canIncrement}
          className="flex items-center justify-center text-white h-8 pl-2 pr-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-800 transition-colors"
          aria-label="Increase bet amount"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
