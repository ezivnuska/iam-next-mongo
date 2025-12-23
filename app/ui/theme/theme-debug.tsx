// app/ui/theme/theme-debug.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/app/lib/hooks/use-theme';

export default function ThemeDebug() {
    const { theme, resolvedTheme } = useTheme();
    const [hasDarkClass, setHasDarkClass] = useState(false);
    const [storedTheme, setStoredTheme] = useState('');

    useEffect(() => {
        setHasDarkClass(document.documentElement.classList.contains('dark'));
        setStoredTheme(localStorage.getItem('theme') || 'none');
    }, [theme, resolvedTheme]);

    return (
        <div className="fixed bottom-4 right-4 bg-yellow-200 dark:bg-yellow-900 text-black dark:text-white p-4 rounded-lg shadow-lg text-xs font-mono z-50">
            <div className="font-bold mb-2">Theme Debug Info:</div>
            <div>Current theme: {theme}</div>
            <div>Resolved theme: {resolvedTheme}</div>
            <div>Has 'dark' class: {hasDarkClass ? 'YES' : 'NO'}</div>
            <div>localStorage: {storedTheme}</div>
        </div>
    );
}
