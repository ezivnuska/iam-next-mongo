// app/tiles/tile-game.tsx

'use client'

import TileGameHeader from './tile-game-header';
import TileBoard from './tile-board';
import PageContent from '@/app/ui/layout/page/page-content';
import { FlexContainer, FlexCenter } from '@/app/ui/flex-container';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import clsx from 'clsx';

export default function TileGame() {
    const horizontalLayout = useHorizontalLayout();
    return (
        <PageContent>
            <FlexContainer className={clsx('items-stretch', {
                'py-4': horizontalLayout,
            })}>
                <TileGameHeader />
                <div className='flex flex-1'>
                    <FlexCenter>
                        <TileBoard />
                    </FlexCenter>
                </div>
            </FlexContainer>
        </PageContent>
    );
}