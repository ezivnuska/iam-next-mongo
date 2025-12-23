// app/lib/providers/theme-provider.tsx

'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Use lazy initializer to read from localStorage on first render
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme') as Theme | null;
            if (stored === 'light' || stored === 'dark' || stored === 'system') {
                return stored;
            }
        }
        return 'system';
    });

    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme') as Theme | null;
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

            if (stored === 'light' || stored === 'dark') {
                return stored;
            }
            return systemTheme;
        }
        return 'dark';
    });

    // Apply theme to document and listen for system preference changes
    useEffect(() => {
        const root = window.document.documentElement;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const getSystemTheme = () => mediaQuery.matches ? 'dark' : 'light';
        const applied = theme === 'system' ? getSystemTheme() : theme;

        root.classList.remove('light', 'dark');
        root.classList.add(applied);
        setResolvedTheme(applied);

        localStorage.setItem('theme', theme);

        // Listen for system preference changes when theme is 'system'
        const handleChange = () => {
            if (theme === 'system') {
                const newSystemTheme = getSystemTheme();
                root.classList.remove('light', 'dark');
                root.classList.add(newSystemTheme);
                setResolvedTheme(newSystemTheme);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme: setThemeState, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
