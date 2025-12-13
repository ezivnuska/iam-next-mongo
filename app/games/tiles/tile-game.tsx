// app/ui/tile-game.tsx

"use client";

import TileGameHeader from './tile-game-header';
import TileBoard from './tile-board';
import ResponsiveSquare from '@/app/ui/responsive-square'

import clsx from 'clsx';
import { useScreenOrientation } from '../poker/lib/hooks/use-screen-orientation';

export type Dimensions = {
    width: number
    height: number
}

export default function TileGame() {
    const orientation = useScreenOrientation()

    return (
        <div className={clsx('flex flex-1 h-full w-full flex-col gap-1', {
            'flex-row justify-between': orientation === 'landscape',
        })}>
            <TileGameHeader />
            <div className={clsx('flex flex-1 grow items-center justify-end border', {
                'grow': orientation === 'portrait',
            })}>
                <ResponsiveSquare>
                    <TileBoard />
                </ResponsiveSquare>
            </div>
        </div>
    )
}
