// app/poker/lib/hooks/use-game-flow-controller.ts

/**
 * Controls game flow by coordinating notifications with game actions.
 *
 * This hook provides a system to delay game progression (stage/turn advancement)
 * until notifications have been displayed for their full duration (5 seconds).
 *
 * ARCHITECTURE:
 * 1. Client-side coordination: Notifications queue and display sequentially
 * 2. Server integration: Send "ready" signals to server after notifications complete
 * 3. The server should wait for these signals before advancing the game
 *
 * USAGE:
 * - Call signalReadyForNextStage() or signalReadyForNextTurn() after notifications
 * - These send socket events to the server indicating readiness
 * - Server should implement corresponding handlers to wait for these signals
 */

'use client';

import { useCallback } from 'react';
import { useSocket } from '@/app/lib/providers/socket-provider';

export function useGameFlowController() {
  const { socket } = useSocket();

  /**
   * Signal to server that client is ready for next stage advancement
   * Should be called after stage advancement notification completes
   */
  const signalReadyForNextStage = useCallback((gameId: string) => {
    if (!socket) return;

    console.log('[GameFlowController] Signaling ready for next stage');
    socket.emit('poker:ready_for_next_stage', { gameId });
  }, [socket]);

  /**
   * Signal to server that client is ready for next turn
   * Should be called after turn advancement notification completes
   */
  const signalReadyForNextTurn = useCallback((gameId: string) => {
    if (!socket) return;

    console.log('[GameFlowController] Signaling ready for next turn');
    socket.emit('poker:ready_for_next_turn', { gameId });
  }, [socket]);

  /**
   * Signal to server that client has finished viewing an action
   * Should be called after player action notification completes
   */
  const signalActionViewed = useCallback((gameId: string, actionType: string) => {
    if (!socket) return;

    console.log(`[GameFlowController] Signaling action viewed: ${actionType}`);
    socket.emit('poker:action_viewed', { gameId, actionType });
  }, [socket]);

  /**
   * Signal to server that client is ready for game to start
   * Should be called after game start notification completes
   */
  const signalReadyForGameStart = useCallback((gameId: string) => {
    if (!socket) return;

    console.log('[GameFlowController] Signaling ready for game start');
    socket.emit('poker:ready_for_game_start', { gameId });
  }, [socket]);

  return {
    signalReadyForNextStage,
    signalReadyForNextTurn,
    signalActionViewed,
    signalReadyForGameStart,
  };
}
