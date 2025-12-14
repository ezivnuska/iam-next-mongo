// app/ui/header/nav-button-square.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ReactNode } from 'react';

interface NavButtonSquareProps {
    href: string;
    title: string;
    icon: ReactNode;
    badge?: number | null;
    onClick?: (href: string) => void;
}

export default function NavButtonSquare({
    href,
    title,
    icon,
    badge,
    onClick
}: NavButtonSquareProps) {
    const pathname = usePathname();
    const isActive = pathname.endsWith(href);

    const handleClick = () => {
        if (onClick) {
            onClick(href);
        }
    };

    return (
        <div className='min-w-[120px] max-w-[200px] min-h-[120px] max-h-[200px] p-4'>
            <Link
                href={href}
                prefetch={true}
                onClick={handleClick}
                className={clsx(
                    'aspect-square flex flex-1 flex-col items-center justify-center p-3 rounded-lg font-medium transition-all relative gap-2',
                    {
                        'bg-blue-300/25 text-black': isActive,
                        'bg-gray-800 text-white hover:bg-sky-100 hover:text-blue-600 hover:border-sky-300': !isActive,
                    }
                )}
            >
                {/* Icon */}
                <div className="w-10 h-10 flex items-center justify-center">
                    {icon}
                </div>

                {/* Title */}
                <span className="text-md text-center leading-tight">
                    {title}
                </span>

                {/* Badge */}
                {badge !== null && badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                        {badge}
                    </span>
                )}
            </Link>
        </div>
    );
}
