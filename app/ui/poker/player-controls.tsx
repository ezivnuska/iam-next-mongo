// app/ui/poker/player-controls.tsx

'use client';

import { usePoker } from '@/app/lib/providers/poker-provider';
import { Button } from '../button';

export default function PlayerControls() {
  const { placeBet, fold } = usePoker();

  const handleBet = () => {
    placeBet(1);
  };

  const handleRaise = () => {
    placeBet(2);
  };

  const handleFold = () => {
    fold();
  };

  return (
    <div
      id="playerControls"
      className='flex flex-row items-center justify-start gap-1'
    >
      <Button id="betButton" onClick={handleBet}>
        Bet
      </Button>
      <Button id="raiseButton" onClick={handleRaise}>
        Raise
      </Button>
      <Button id="foldButton" onClick={handleFold}>
        Fold
      </Button>
    </div>
  );
}
