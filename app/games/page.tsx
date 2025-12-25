// app/games/page.tsx

import PageHeader from '../ui/layout/page-header';
import Link from 'next/link';
import { PuzzlePieceIcon } from '@heroicons/react/24/solid';
import { Metadata } from 'next';
import PageContent from '../ui/layout/page/page-content';
import PokerChipIcon from '../ui/icons/poker-chip-icon';

export const metadata: Metadata = {
    title: 'Games',
    description: 'Interactive games and projects',
};

const games = [
    {
        title: 'Tiles',
        description: 'A tile-matching puzzle game',
        href: '/games/tiles',
        icon: PuzzlePieceIcon,
    },
    {
        title: 'Poker',
        description: 'Play Texas Hold\'em poker',
        href: '/games/poker',
        icon: PokerChipIcon,
    },
];

export default function GamesPage() {
    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'Games', href: '/?section=games', active: true }
                ]}
                subtitle='Interactive games and projects'
            />

            <div className='grid gap-4 px-2 pb-8'>
                {games.map((game) => {
                    const IconComponent = game.icon;
                    return (
                        <Link
                            key={game.href}
                            href={game.href}
                            className='flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-gray-700 transition-all duration-200 group'
                        >
                            <div className='shrink-0'>
                                <IconComponent className='w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors' />
                            </div>
                            <div className='flex-1'>
                                <h2 className='text-xl font-bold text-white group-hover:text-blue-400 transition-colors'>
                                    {game.title}
                                </h2>
                                <p className='text-gray-400 mt-1'>
                                    {game.description}
                                </p>
                            </div>
                            <div className='shrink-0 text-gray-600 group-hover:text-blue-500 transition-colors'>
                                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                                </svg>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </PageContent>
    );
}
