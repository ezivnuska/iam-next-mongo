// app/tiles/tile-game.tsx

'use client'

import TileGameHeader from './tile-game-header';
import TileBoard from './tile-board';
import PageContent from '@/app/ui/layout/page/page-content';
import { FlexContainer, FlexCenter } from '@/app/ui/flex-container';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import Breadcrumbs from '@/app/ui/layout/breadcrumbs';

export default function TileGame() {
    const horizontalLayout = useHorizontalLayout();
    return (
        <PageContent>
            <FlexContainer className='items-stretch'>
                <div className='flex flex-row items-center justify-between gap-4 w-full'>
                    <Breadcrumbs
                        breadcrumbs={[
                            { label: 'Games', href: '/games' },
                            { label: 'Tiles', href: '/games/tiles', active: true },
                        ]}
                    />
                    <TileGameHeader />
                </div>
                <FlexCenter className='flex-col mx-2'>
                    <TileBoard />
                </FlexCenter>
            </FlexContainer>
        </PageContent>
    );
}