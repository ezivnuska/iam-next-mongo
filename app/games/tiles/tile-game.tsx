// app/tiles/tile-game.tsx

'use client'

import TileGameHeader from './tile-game-header';
import TileBoard from './tile-board';
import PageContent from '@/app/ui/layout/page/page-content';
import { FlexContainer, FlexCenter } from '@/app/ui/flex-container';

export default function TileGame() {
    return (
        <PageContent>
            <FlexContainer className='items-stretch gap-2'>
                <TileGameHeader />
                <FlexCenter>
                    <TileBoard />
                </FlexCenter>
            </FlexContainer>
        </PageContent>
    );
}