'use client';

import { useEffect, useState } from 'react';

const SITES = [
    { label: 'iameric', hostname: 'iameric.me', href: 'https://iameric.me' },
    { label: 'games', hostname: 'games.iameric.me', href: 'https://games.iameric.me' },
    { label: 'staging', hostname: 'staging.iameric.me', href: 'https://staging.iameric.me' },
];

export default function SiteSwitcher() {
    const [hostname, setHostname] = useState('');

    useEffect(() => {
        setHostname(window.location.hostname);
    }, []);

    return (
        <div style={{ position: 'fixed', bottom: '0.75rem', right: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', zIndex: 50 }}>
            {SITES.map(({ label, hostname: siteHostname, href }) => {
                const isCurrent = hostname === siteHostname;
                return isCurrent ? (
                    <span
                        key={href}
                        className='text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-medium opacity-80 cursor-default'
                    >
                        {label}
                    </span>
                ) : (
                    <a
                        key={href}
                        href={href}
                        className='text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors'
                    >
                        {label}
                    </a>
                );
            })}
        </div>
    );
}
