'use client';

import { useEffect } from 'react';

export function useAppHeight() {
    useEffect(() => {
        const sync = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, []);
}
