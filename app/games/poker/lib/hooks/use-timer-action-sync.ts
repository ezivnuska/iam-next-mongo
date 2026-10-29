import { useEffect, useRef } from 'react';

type ActionType = 'bet' | 'call' | 'raise' | 'fold' | 'check';

interface UseTimerActionSyncProps {
    timerActive: boolean;
    selectedAction: ActionType;
    betAmount: number;
    currentBet: number;
    hasBetToCall: boolean;
    setTurnTimerAction: (action: ActionType, amount?: number) => Promise<void>;
}

export function useTimerActionSync({
    timerActive,
    selectedAction,
    betAmount,
    currentBet,
    hasBetToCall,
    setTurnTimerAction,
}: UseTimerActionSyncProps) {
    const actionChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!timerActive) return;

        let actionToSet: ActionType;
        if (selectedAction === 'bet' || selectedAction === 'raise') {
            actionToSet = hasBetToCall
                ? (betAmount === currentBet ? 'call' : 'raise')
                : 'bet';
        } else {
            actionToSet = selectedAction;
        }

        if (actionChangeTimeoutRef.current) {
            clearTimeout(actionChangeTimeoutRef.current);
        }

        actionChangeTimeoutRef.current = setTimeout(async () => {
            try {
                if (actionToSet === 'bet' || actionToSet === 'raise' || actionToSet === 'call') {
                    await setTurnTimerAction(actionToSet, betAmount);
                } else {
                    await setTurnTimerAction(actionToSet);
                }
            } catch (err) {
                console.error('Error updating timer action:', err);
            }
        }, 300);

        return () => {
            if (actionChangeTimeoutRef.current) {
                clearTimeout(actionChangeTimeoutRef.current);
            }
        };
    }, [timerActive, selectedAction, hasBetToCall, betAmount, currentBet, setTurnTimerAction]);
}
