// app/ui/theme/theme-toggle.tsx

'use client';

import { useTheme } from '@/app/lib/hooks/use-theme';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
        setTheme(nextTheme);
    };

    const getIcon = () => {
        switch (theme) {
            case 'light':
                return <SunIcon className='h-6 w-6' />;
            case 'dark':
                return <MoonIcon className='h-6 w-6' />;
            case 'system':
                return <ComputerDesktopIcon className='h-6 w-6' />;
        }
    };

    const getLabel = () => {
        switch (theme) {
            case 'light':
                return 'Light mode';
            case 'dark':
                return 'Dark mode';
            case 'system':
                return 'System theme';
        }
    };

    return (
        <button
            onClick={cycleTheme}
            className='flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-500'
            aria-label={`Current theme: ${getLabel()}. Click to cycle themes.`}
            title={getLabel()}
        >
            {getIcon()}
        </button>
    );
}
