// app/ui/leaderboard.tsx

"use client";

import React from 'react'
import { useUser } from '@/app/lib/providers/user-provider'
import type { Score } from '@/app/lib/definitions/tiles'
import UserAvatar from '@/app/ui/user/user-avatar'
import { Button } from '@/app/ui/button'

type LeaderboardProps = {
    scores: Score[]
    clearScores: () => void
}

export default function Leaderboard({ scores, clearScores }: LeaderboardProps) {
    const { user } = useUser()

    const renderItem = (item: Score, index: number) => {
        return (
            <div
                key={item._id}
                className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded"
            >
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-400 w-6">{index + 1}</span>
                    <div className='w-24 h-24'>
                        <UserAvatar
                            username={item.user.username}
                            avatar={item.user.avatar}
                            // size={32}
                        />
                    </div>
                    <span className="text-sm">{item.user.username}</span>
                </div>
                <span className="font-mono font-semibold">{item.score}</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">High Scores</h2>
                {scores.length > 0 && user?.role === 'admin' && (
                    <Button onClick={clearScores} variant="warn" size="sm">
                        Clear
                    </Button>
                )}
            </div>

            <div className="flex flex-col">
                {scores.length > 0 ? (
                    scores.map((item, index) => renderItem(item, index))
                ) : (
                    <p className="text-center text-gray-500 py-8">
                        No scores yet. Be the first!
                    </p>
                )}
            </div>
        </div>
    )
}
