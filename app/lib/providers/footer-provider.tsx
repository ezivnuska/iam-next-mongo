'use client';

import { createContext, useContext, useState } from 'react';

interface FooterContextValue {
    footer: React.ReactNode;
    setFooter: (node: React.ReactNode) => void;
}

const FooterContext = createContext<FooterContextValue>({
    footer: null,
    setFooter: () => {},
});

export function FooterProvider({ children }: { children: React.ReactNode }) {
    const [footer, setFooter] = useState<React.ReactNode>(null);
    return (
        <FooterContext.Provider value={{ footer, setFooter }}>
            {children}
        </FooterContext.Provider>
    );
}

export function useFooter() {
    return useContext(FooterContext);
}
