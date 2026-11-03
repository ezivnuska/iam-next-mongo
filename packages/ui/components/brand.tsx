'use client';

import Link from 'next/link';

interface BrandProps {
    href?: string;
}

export default function Brand({ href = '/' }: BrandProps) {
    return (
        <Link
            href={href}
            className='no-underline shrink-0'
            style={{ color: 'inherit' }}
        >
            <span
                className='font-bold leading-none text-gray-900 whitespace-nowrap'
                style={{ fontSize: 'clamp(18px, 4vw, 32px)' }}
            >
                iameric
            </span>
        </Link>
    );
}
