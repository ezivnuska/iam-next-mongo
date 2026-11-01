'use client';

import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../providers/theme-provider';

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
    };

    const icon = theme === 'light'
        ? <SunIcon className='h-6 w-6' />
        : theme === 'dark'
            ? <MoonIcon className='h-6 w-6' />
            : <ComputerDesktopIcon className='h-6 w-6' />;

    const label = theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System theme';

    return (
        <button
            onClick={cycleTheme}
            className='flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-blue-500'
            aria-label={`Current theme: ${label}. Click to cycle themes.`}
            title={label}
        >
            {icon}
        </button>
    );
}
