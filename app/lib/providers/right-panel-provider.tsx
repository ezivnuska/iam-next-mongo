'use client';

import { createContext, useContext, useState } from 'react';

interface RightPanelContextValue {
    rightPanel: React.ReactNode;
    setRightPanel: (node: React.ReactNode) => void;
}

const RightPanelContext = createContext<RightPanelContextValue>({
    rightPanel: null,
    setRightPanel: () => {},
});

export function RightPanelProvider({ children }: { children: React.ReactNode }) {
    const [rightPanel, setRightPanel] = useState<React.ReactNode>(null);
    return (
        <RightPanelContext.Provider value={{ rightPanel, setRightPanel }}>
            {children}
        </RightPanelContext.Provider>
    );
}

export function useRightPanel() {
    return useContext(RightPanelContext);
}
