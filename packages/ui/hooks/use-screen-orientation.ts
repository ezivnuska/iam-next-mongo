'use client';

import { useState, useEffect } from 'react';

export type ScreenOrientation = 'portrait' | 'landscape';

function getOrientation(): ScreenOrientation {
    return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
}

export function useScreenOrientation(): ScreenOrientation {
    const [orientation, setOrientation] = useState<ScreenOrientation>(() => {
        if (typeof window !== 'undefined') return getOrientation();
        return 'portrait';
    });

    useEffect(() => {
        const mq = window.matchMedia('(orientation: landscape)');
        const update = () => setOrientation(mq.matches ? 'landscape' : 'portrait');
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    return orientation;
}
