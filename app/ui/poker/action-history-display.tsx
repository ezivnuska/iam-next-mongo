// app/ui/poker/action-history-display.tsx

'use client';

import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { useGameState } from '@/app/lib/providers/poker-provider';
import { ActionHistoryType } from '@/app/lib/definitions/action-history';
import { Button } from '../button';

function ActionHistoryDisplay() {
  const { actionHistory, stage: currentStage } = useGameState();
  const currentStageRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Group actions by stage
  const actionsByStage = useMemo(() => {
    const grouped = {
      preGame: [] as any[],
      preflop: [] as any[],
      flop: [] as any[],
      turn: [] as any[],
      river: [] as any[],
    };

    actionHistory.forEach((action) => {
      const stage = action.stage;
      if (stage === -1) {
        grouped.preGame.push(action);
      } else if (stage === 0) {
        grouped.preflop.push(action);
      } else if (stage === 1) {
        grouped.flop.push(action);
      } else if (stage === 2) {
        grouped.turn.push(action);
      } else if (stage === 3) {
        grouped.river.push(action);
      }
    });

    return grouped;
  }, [actionHistory]);

  // Auto-scroll to current stage
  useEffect(() => {
    if (currentStageRef.current) {
      currentStageRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStage]);

  // Get icon and description for an action
  const getActionDisplay = (action: any) => {
    switch (action.actionType) {
      case ActionHistoryType.PLAYER_JOINED:
        return { icon: '👋', text: `${action.playerName} joined the game`, color: 'text-green-700' };
      case ActionHistoryType.PLAYER_LEFT:
        return { icon: '👋', text: `${action.playerName} left the game`, color: 'text-orange-700' };
      case ActionHistoryType.PLAYER_BET:
        return { icon: '💰', text: `${action.playerName} bet ${action.chipAmount} chip${action.chipAmount !== 1 ? 's' : ''}`, color: 'text-blue-700' };
      case ActionHistoryType.PLAYER_FOLD:
        return { icon: '🙅', text: `${action.playerName} folded`, color: 'text-red-700' };
      case ActionHistoryType.CARDS_DEALT:
        if (action.cardsDealt === 2) {
          return { icon: '🎴', text: `Players received their cards`, color: 'text-purple-700' };
        }
        return { icon: '🃏', text: `${action.cardsDealt} community card${action.cardsDealt !== 1 ? 's' : ''} dealt`, color: 'text-purple-700' };
      case ActionHistoryType.STAGE_ADVANCED:
        const stageNames = ['Preflop', 'Flop', 'Turn', 'River'];
        return { icon: '➡️', text: `Advanced to ${stageNames[action.toStage] || 'Unknown'}`, color: 'text-indigo-700' };
      case ActionHistoryType.GAME_STARTED:
        return { icon: '🎮', text: 'Game started', color: 'text-green-800 font-semibold' };
      case ActionHistoryType.GAME_ENDED:
        return { icon: '🏆', text: `${action.winnerName} won the game!`, color: 'text-yellow-700 font-semibold' };
      default:
        return { icon: '•', text: 'Unknown action', color: 'text-gray-600' };
    }
  };

  const renderStageSection = (stageName: string, stageNum: number, actions: any[], emoji: string) => {
    if (actions.length === 0) return null;

    const isCurrentStage = stageNum === currentStage;

    return (
      <div
        key={stageName}
        ref={isCurrentStage ? currentStageRef : null}
        className={`border-l-4 pl-4 mb-6 ${
          isCurrentStage ? 'border-blue-500' : 'border-gray-300'
        }`}
      >
        {/* Stage Header */}
        <div className={`flex items-center gap-2 mb-3 ${isCurrentStage ? 'font-bold' : ''}`}>
          <span className="text-2xl">{emoji}</span>
          <h3 className={`text-lg ${isCurrentStage ? 'text-blue-900' : 'text-gray-800'}`}>
            {stageName}
            {isCurrentStage && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Current</span>}
          </h3>
        </div>

        {/* Actions List */}
        <div className="space-y-2">
          {actions.map((action, idx) => {
            const display = getActionDisplay(action);
            return (
              <div
                key={action.id || idx}
                className="flex items-start gap-2 text-sm py-1"
              >
                <span className="text-lg flex-shrink-0">{display.icon}</span>
                <span className={display.color}>{display.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!actionHistory || actionHistory.length === 0) {
    return null;
  }

  // Get the last action for the header
  const lastAction = actionHistory[actionHistory.length - 1];
  const lastActionDisplay = getActionDisplay(lastAction);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white border-2 border-gray-300 rounded-lg shadow-md overflow-hidden">
        {/* Header - Shows last action and toggle button */}
        <div
          className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xl">{lastActionDisplay.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Latest Action</h3>
              <p className={`text-sm ${lastActionDisplay.color}`}>
                {lastActionDisplay.text}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="ml-2"
          >
            {isExpanded ? '▲' : '▼'}
          </Button>
        </div>

        {/* Expandable Timeline Content */}
        {isExpanded && (
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="mb-4 text-xs text-gray-600">
              {actionHistory.length} action{actionHistory.length !== 1 ? 's' : ''} recorded
            </div>
            {renderStageSection('Pre-Game', -1, actionsByStage.preGame, '🎲')}
            {renderStageSection('Preflop', 0, actionsByStage.preflop, '🎮')}
            {renderStageSection('Flop', 1, actionsByStage.flop, '🃏')}
            {renderStageSection('Turn', 2, actionsByStage.turn, '🎴')}
            {renderStageSection('River', 3, actionsByStage.river, '🌊')}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ActionHistoryDisplay);
