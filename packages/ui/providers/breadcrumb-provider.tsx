'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface BreadcrumbContextValue {
    overrides: Map<string, string>;
    setOverride: (segment: string, label: string) => void;
    clearOverride: (segment: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
    overrides: new Map(),
    setOverride: () => {},
    clearOverride: () => {},
});

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
    const [overrides, setOverrides] = useState<Map<string, string>>(new Map());

    function setOverride(segment: string, label: string) {
        setOverrides(prev => {
            if (prev.get(segment) === label) return prev;
            return new Map(prev).set(segment, label);
        });
    }

    function clearOverride(segment: string) {
        setOverrides(prev => {
            if (!prev.has(segment)) return prev;
            const next = new Map(prev);
            next.delete(segment);
            return next;
        });
    }

    return (
        <BreadcrumbContext.Provider value={{ overrides, setOverride, clearOverride }}>
            {children}
        </BreadcrumbContext.Provider>
    );
}

export function useBreadcrumbContext(): BreadcrumbContextValue {
    return useContext(BreadcrumbContext);
}

export function useSetBreadcrumbLabel(segment: string, label: string): void {
    const { setOverride, clearOverride } = useBreadcrumbContext();
    useEffect(() => {
        if (!segment || !label) return;
        setOverride(segment, label);
        return () => clearOverride(segment);
    }, [segment, label]);
}
