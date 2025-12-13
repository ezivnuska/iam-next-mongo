// app/ui/tile-game-header.tsx

"use client";

import React, { useMemo, useState } from 'react'
import { Button } from '@/app/ui/button'
import { useTiles } from '@/app/lib/providers/tile-provider'
import { GameStatus } from '@/app/lib/definitions/tiles'
import UserAvatar from '@/app/ui/user/user-avatar'
import Modal from '@/app/ui/modal'
import Leaderboard from './leaderboard'
import clsx from 'clsx';
import { useScreenOrientation } from '../poker/lib/hooks/use-screen-orientation';

export default function TileGameHeader() {
    const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
    const orientation = useScreenOrientation()
    
    const {
        scores,
        status,
        ticks,
        time,
        clearScores,
        setStatus,
    } = useTiles()

    const startPlay = () => setStatus(GameStatus.START)
    const unpause = () => setStatus(GameStatus.PLAYING)
    const pause = () => setStatus(GameStatus.PAUSED)
    const reset = () => setStatus(GameStatus.IDLE)

    const topScore = useMemo(() => {
        if (scores.length > 0) {
            return scores[0]
        }
        return null
    }, [scores])

    const renderNavButton = () => {
        switch (status) {
            case GameStatus.IDLE: return renderStartButton()
            case GameStatus.PLAYING: return renderPauseButton()
            case GameStatus.PAUSED: return renderResumeButton()
            case GameStatus.RESOLVED: return renderReplayButton()
            default: return null
        }
    }

    const handleClearScores = async () => {
        await clearScores()
        setShowLeaderboardModal(false)
    }

    const showLeaderboard = () => {
        setShowLeaderboardModal(true)
    }

    const renderStartButton = () => status === GameStatus.IDLE ? (
        <Button onClick={startPlay} variant="default">
            ▶ Play
        </Button>
    ) : null

    const renderPauseButton = () => status === GameStatus.PLAYING ? (
        <Button onClick={pause} variant="default">
            ⏸ Pause
        </Button>
    ) : null

    const renderResumeButton = () => status === GameStatus.PAUSED ? (
        <Button onClick={unpause} variant="default">
            ▶ Resume
        </Button>
    ) : null

    const renderReplayButton = () => status === GameStatus.RESOLVED ? (
        <Button onClick={startPlay} variant="default">
            🏆 Winner!
        </Button>
    ) : null

    const renderKillButton = () => status === GameStatus.PAUSED ? (
        <Button onClick={reset} variant="warn" size="sm">
            ✕
        </Button>
    ) : null

    const renderTopScore = () => topScore ? (
        <button
            onClick={showLeaderboard}
            className="flex flex-col items-center justify-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
            <div className="flex items-center gap-1">
                <span className="font-bold text-sm">Fastest</span>
                <span className="text-sm">›</span>
            </div>
            <div className="flex items-center gap-2">
                <div className='w-8 h-8'>
                    <UserAvatar
                        username={topScore.user.username}
                        avatar={topScore.user.avatar}
                        // size={24}
                    />
                </div>
                <span className="text-sm">{topScore.score}</span>
            </div>
        </button>
    ) : null

    return (
        <div className={clsx('flex flex-col items-center justify-between w-full gap-4',
            {
                'flex-row items-center border': orientation === 'portrait',
            }
        )}>
            {renderNavButton()}
            {renderKillButton()}
            {time && ticks > 0 && (
                <span className="font-bold text-xl">{time}</span>
            )}
            {renderTopScore()}
            {/* Leaderboard Modal */}
            {showLeaderboardModal && (
                <Modal
                    onClose={() => setShowLeaderboardModal(false)}
                    position="fixed"
                    showCloseButton
                >
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <Leaderboard scores={scores} clearScores={handleClearScores} />

                        <div className="mt-6">
                            <Button
                                onClick={() => setShowLeaderboardModal(false)}
                                variant="ghost"
                                className="w-full"
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
