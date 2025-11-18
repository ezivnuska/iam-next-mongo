// app/poker/lib/hooks/use-stage-coordinator.ts

/**
 * Coordinates game state advancement (stage) with notification display.
 *
 * This hook ensures that stage changes are delayed until their associated
 * notifications have been fully displayed. This creates a smoother, more
 * intentional game flow.
 *
 * STAGE ADVANCEMENT FLOW:
 * 1. Server sends stage update (e.g., Preflop → Flop)
 * 2. This hook checks for pending action notifications (blinds, bets, etc.)
 * 3. If actions pending: stage update is deferred
 * 4. When actions complete: queues stage notification ("Flop", "Turn", "River")
 * 5. After notification completes (5 seconds), applies the stage change
 * 6. Then signals server that client is ready for next action
 *
 * TURN NOTIFICATIONS:
 * - Handled by notification bridge (use-notification-bridge.ts)
 * - Queued with category 'other' (don't block stage advancement)
 * - Display asynchronously after action notifications
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useNotifications } from '../providers/notification-provider';
import type { Card, Player } from '../definitions/poker';
import { POKER_TIMERS } from '../config/poker-constants';

interface StageUpdateData {
  stage: number;
  communalCards: Card[];
  currentPlayerIndex?: number;
}

type PlaySoundFn = (soundType: 'card-deal' | 'single-card') => void;

export function useStageCoordinator(gameId: string | null, playSound?: PlaySoundFn) {
  const { isActionNotificationActive } = useNotifications();
  const currentStageRef = useRef<number>(0);
  const pendingStageUpdateRef = useRef<{ data: StageUpdateData; callbacks: any } | null>(null);

  /**
   * Applies a stage update with notification coordination.
   *
   * If the stage is advancing (not resetting), it queues the notification first
   * and delays the actual state update until after the notification completes.
   *
   * In auto-advance mode (all players all-in), signals server after each stage completes.
   */
  const applyStageUpdate = useCallback((
    data: StageUpdateData,
    setStage: (stage: number) => void,
    setCommunalCards: (cards: Card[]) => void,
    setCurrentPlayerIndex?: (index: number) => void,
    autoAdvanceMode?: boolean
  ) => {
    const { stage, communalCards, currentPlayerIndex } = data;
    const prevStage = currentStageRef.current;

    console.log('[StageCoordinator] Stage update:', { prevStage, newStage: stage, autoAdvanceMode });

    // If stage is not advancing (same or going backwards), check for action notifications
    if (stage <= prevStage) {
      console.log('[StageCoordinator] Stage not advancing (stage:', stage, ', prevStage:', prevStage, ')');

      // Even for non-advancing stages, we should wait for action notifications
      // This is especially important for game start (stage 0 -> 0) when blinds are being posted
      if (isActionNotificationActive()) {
        console.log('[StageCoordinator] Action notification active for non-advancing stage, deferring update');

        // Store the pending update to be applied after notification completes
        pendingStageUpdateRef.current = {
          data: { stage, communalCards, currentPlayerIndex },
          callbacks: { setStage, setCommunalCards, setCurrentPlayerIndex },
        };

        return;
      }

      console.log('[StageCoordinator] No action notification active, applying non-advancing stage update immediately');
      setStage(stage);
      setCommunalCards(communalCards);
      if (currentPlayerIndex !== undefined && setCurrentPlayerIndex) {
        setCurrentPlayerIndex(currentPlayerIndex);
      }
      currentStageRef.current = stage;

      // NOTE: For non-advancing stages (same stage or going backwards),
      // we do NOT play sounds because no new cards are being dealt.
      // Sounds only play when stage actually advances (new cards revealed).

      return;
    }

    // Stage is advancing - coordinate with notification
    const stageNames = ['Pre-flop', 'Flop', 'Turn', 'River', 'Showdown'];
    const stageName = stageNames[stage] || `Stage ${stage}`;

    console.log('[StageCoordinator] Stage advancement requested:', stageName);

    // Check if there's an action notification that needs to complete first
    if (isActionNotificationActive()) {
      console.log('[StageCoordinator] Action notification active, deferring stage advancement');

      // Store the pending stage update to be applied after notification completes
      pendingStageUpdateRef.current = {
        data: { stage, communalCards, currentPlayerIndex },
        callbacks: { setStage, setCommunalCards, setCurrentPlayerIndex },
      };

      return;
    }

    console.log('[StageCoordinator] No action notification active, applying stage advancement immediately');

    // Apply stage update immediately without notification
    setStage(stage);
    setCommunalCards(communalCards);
    if (currentPlayerIndex !== undefined && setCurrentPlayerIndex) {
      setCurrentPlayerIndex(currentPlayerIndex);
    }
    currentStageRef.current = stage;

    // Play sound effect based on what cards are being dealt
    if (playSound) {
      const communalCardsCount = communalCards?.length || 0;

      if (stage === 0 && communalCardsCount === 0) {
        // Hole cards (Preflop stage with no communal cards)
        console.log('[StageCoordinator] Playing card-deal sound for hole cards');
        playSound('card-deal');
      } else if (stage === 1 && communalCardsCount === 3) {
        // Flop (3 communal cards)
        console.log('[StageCoordinator] Playing card-deal sound for Flop');
        playSound('card-deal');
      } else if ((stage === 2 || stage === 3) && communalCardsCount > 0) {
        // Turn or River (1 card each)
        console.log('[StageCoordinator] Playing single-card sound for Turn/River');
        playSound('single-card');
      }
    }

    // NOTE: Server handles turn advancement automatically with 2-second delay - no client signaling needed
    console.log(`[StageCoordinator] Stage update applied: ${stageName}`);
  }, [gameId, isActionNotificationActive, playSound]);


  /**
   * Resets the coordinator state (for game reset)
   */
  const resetCoordinator = useCallback(() => {
    console.log('[StageCoordinator] Resetting coordinator state');
    currentStageRef.current = 0;
    pendingStageUpdateRef.current = null;
  }, []);

  /**
   * Check if we have a pending stage update and no action notification is active
   * If so, apply the pending stage update
   */
  useEffect(() => {
    const pending = pendingStageUpdateRef.current;

    if (!pending) return;

    // Check if action notification has completed
    if (!isActionNotificationActive()) {
      console.log('[StageCoordinator] Action notification complete, applying pending stage update');

      const { data, callbacks } = pending;

      // Clear the pending update
      pendingStageUpdateRef.current = null;

      // Check if this is a stage advancement or just a non-advancing update
      const isStageAdvancing = data.stage > currentStageRef.current;

      if (isStageAdvancing) {
        // Stage is advancing - apply immediately
        const stageNames = ['Pre-flop', 'Flop', 'Turn', 'River', 'Showdown'];
        const stageName = stageNames[data.stage] || `Stage ${data.stage}`;

        console.log('[StageCoordinator] Applying deferred stage advancement:', stageName);
        callbacks.setStage(data.stage);
        callbacks.setCommunalCards(data.communalCards);
        if (data.currentPlayerIndex !== undefined && callbacks.setCurrentPlayerIndex) {
          callbacks.setCurrentPlayerIndex(data.currentPlayerIndex);
        }
        currentStageRef.current = data.stage;

        // Play sound effect based on what cards are being dealt
        if (playSound) {
          const communalCardsCount = data.communalCards?.length || 0;

          if (data.stage === 0 && communalCardsCount === 0) {
            // Hole cards (Preflop stage with no communal cards)
            console.log('[StageCoordinator] Playing card-deal sound for hole cards');
            playSound('card-deal');
          } else if (data.stage === 1 && communalCardsCount === 3) {
            // Flop (3 communal cards)
            console.log('[StageCoordinator] Playing card-deal sound for Flop');
            playSound('card-deal');
          } else if ((data.stage === 2 || data.stage === 3) && communalCardsCount > 0) {
            // Turn or River (1 card each)
            console.log('[StageCoordinator] Playing single-card sound for Turn/River');
            playSound('single-card');
          }
        }

        // NOTE: Server handles turn advancement automatically - no client signaling needed
        console.log(`[StageCoordinator] Deferred stage update applied: ${stageName}`);
      } else {
        // Non-advancing stage update (e.g., card dealing at same stage) - apply immediately
        console.log('[StageCoordinator] Applying deferred non-advancing update immediately:', data.stage);
        callbacks.setStage(data.stage);
        callbacks.setCommunalCards(data.communalCards);
        if (data.currentPlayerIndex !== undefined && callbacks.setCurrentPlayerIndex) {
          callbacks.setCurrentPlayerIndex(data.currentPlayerIndex);
        }
        currentStageRef.current = data.stage;

        // NOTE: For non-advancing stages, we do NOT play sounds
        // Sounds only play when stage actually advances (new cards revealed)
      }
    }
  }, [isActionNotificationActive, gameId, playSound]);

  return { applyStageUpdate, resetCoordinator };
}
