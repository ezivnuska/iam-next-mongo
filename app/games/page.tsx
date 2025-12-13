// app/games/page.tsx

import DefaultPage from '../ui/layout/page/default-page';
import PageHeader from '../ui/layout/page-header';
import Link from 'next/link';
import { PuzzlePieceIcon } from '@heroicons/react/24/solid';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Games',
    description: 'Interactive games and projects',
};

// Simple poker chip icon
function PokerChipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="6" fill="currentColor" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <circle cx="12" cy="20" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

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
        <DefaultPage>
            <PageHeader
                title='Games'
                subtitle='Interactive games and projects'
            />

            <div className="grid gap-4 px-2 pb-8">
                {games.map((game) => {
                    const IconComponent = game.icon;
                    return (
                        <Link
                            key={game.href}
                            href={game.href}
                            className="flex items-center gap-4 p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                        >
                            <div className="flex-shrink-0">
                                <IconComponent className="w-12 h-12 text-gray-600 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {game.title}
                                </h2>
                                <p className="text-gray-600 mt-1">
                                    {game.description}
                                </p>
                            </div>
                            <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </DefaultPage>
    );
}
