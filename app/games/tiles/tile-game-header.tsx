// app/ui/tile-game-header.tsx

'use client';

import React, { useMemo, useState } from 'react'
import { Button } from '@/app/ui/button'
import { useTiles } from '@/app/lib/providers/tile-provider'
import { GameStatus } from '@/app/lib/definitions/tiles'
import UserAvatar from '@/app/ui/user/user-avatar'
import Modal from '@/app/ui/modal'
import Leaderboard from './leaderboard'
import clsx from 'clsx';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import {
    PauseCircleIcon,
    PlayCircleIcon,
    StopCircleIcon,
} from '@heroicons/react/24/solid';

export default function TileGameHeader() {
    const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
    const horizontalLayout = useHorizontalLayout();
    
    const {
        scores,
        status,
        ticks,
        time,
        clearScores,
        setStatus,
    } = useTiles();

    const startPlay = () => setStatus(GameStatus.START);
    const unpause = () => setStatus(GameStatus.PLAYING);
    const pause = () => setStatus(GameStatus.PAUSED);
    const reset = () => setStatus(GameStatus.IDLE);

    const topScore = useMemo(() => {
        if (scores.length > 0) {
            return scores[0];
        }
        return null;
    }, [scores]);

    const renderNavButton = () => {
        switch (status) {
            case GameStatus.IDLE: return renderStartButton();
            case GameStatus.PLAYING: return renderPauseButton();
            case GameStatus.PAUSED: return renderResumeButton();
            case GameStatus.RESOLVED: return renderReplayButton();
            default: return null;
        }
    }

    const handleClearScores = async () => {
        await clearScores();
        setShowLeaderboardModal(false);
    }

    const showLeaderboard = () => {
        setShowLeaderboardModal(true);
    }

    const renderStartButton = () => status === GameStatus.IDLE ? (
        <Button onClick={startPlay} variant='ghost'>
            <PlayCircleIcon className='w-12 h-12' />
            <span className='text-lg'>Play</span>
        </Button>
    ) : null;

    const renderPauseButton = () => status === GameStatus.PLAYING ? (
        <Button onClick={pause} variant='ghost'>
            <PauseCircleIcon className='w-12 h-12' />
            <span className='text-lg'>Pause</span>
        </Button>
    ) : null

    const renderResumeButton = () => status === GameStatus.PAUSED ? (
        <Button onClick={unpause} variant='ghost'>
            <PlayCircleIcon className='w-12 h-12' />
            <span className='text-lg'>Resume</span>
        </Button>
    ) : null

    const renderReplayButton = () => status === GameStatus.RESOLVED ? (
        <Button onClick={startPlay} variant='default'>
            Winner!
        </Button>
    ) : null

    const renderKillButton = () => status === GameStatus.PAUSED ? (
        <Button onClick={reset} variant='ghost' className='text-red-500'>
            <span className='text-lg'>Quit</span>
            <StopCircleIcon className='w-12 h-12' />
        </Button>
    ) : null

    const renderTopScore = () => topScore ? (
        <button
            onClick={showLeaderboard}
            className='flex flex-col items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity'
        >
            <div className='flex items-center gap-1'>
                <span className='font-bold text-sm'>Fastest</span>
                <span className='text-sm'>›</span>
            </div>
            <div className='flex items-center gap-2'>
                <div className='w-8 h-8'>
                    <UserAvatar
                        username={topScore.user.username}
                        avatar={topScore.user.avatar}
                        // size={24}
                    />
                </div>
                <span className='text-sm'>{topScore.score}</span>
            </div>
        </button>
    ) : null

    return (
        <div className='flex flex-row items-stretch justify-between'>
            <div className='flex flex-1 flex-row items-center justify-start'>
                {renderNavButton()}
            </div>
            <div className='flex flex-2 flex-row items-center justify-center'>
                {time && ticks > 0 && (
                    <span className='font-bold text-xl'>{time}</span>
                )}
            </div>
            <div className='flex flex-1 flex-row items-center justify-end'>
                {renderKillButton()}
            </div>
            {renderTopScore()}
            {/* Leaderboard Modal */}
            {showLeaderboardModal && (
                <Modal
                    onClose={() => setShowLeaderboardModal(false)}
                    position='fixed'
                    showCloseButton
                >
                    <div className='bg-white rounded-lg p-6 max-w-md w-full'>
                        <Leaderboard scores={scores} clearScores={handleClearScores} />

                        <div className='mt-6'>
                            <Button
                                onClick={() => setShowLeaderboardModal(false)}
                                variant='ghost'
                                className='w-full'
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
