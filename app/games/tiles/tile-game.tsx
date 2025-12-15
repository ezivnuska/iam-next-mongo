// app/tiles/tile-game.tsx

'use client'

import clsx from 'clsx';
import { useScreenOrientation } from '../poker/lib/hooks/use-screen-orientation';
import TileGameHeader from './tile-game-header';
import TileBoard from './tile-board';
import ResponsiveSquare from '@/app/ui/responsive-square'

export default function TileGame() {
    const orientation = useScreenOrientation()
    const isPortrait = orientation === 'portrait'
    return (
        <div className='flex flex-col flex-1 h-full w-full gap-2'>
            <TileGameHeader />
            <div className={clsx('flex flex-1 items-center justify-center', {
                'justify-center': isPortrait,
            })}>
                <ResponsiveSquare>
                    <TileBoard />
                </ResponsiveSquare>
            </div>
        </div>
    );
}