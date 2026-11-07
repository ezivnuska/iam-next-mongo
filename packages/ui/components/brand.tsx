'use client';

import Link from 'next/link';

interface BrandProps {
    href?: string;
    compact?: boolean;
}

export default function Brand({ href = '/', compact = false }: BrandProps) {
    return (
        <Link
            href={href}
            className='no-underline'
            style={{ color: 'inherit' }}
        >
            <span
                className='font-bold leading-none text-gray-900 whitespace-nowrap'
                style={{ fontSize: compact ? '18px' : 'clamp(18px, 4vw, 32px)' }}
            >
                iameric
            </span>
        </Link>
    );
}
