interface PageContentGridProps {
    children: React.ReactNode;
    minColWidth?: number;
    className?: string;
}

export default function PageContentGrid({ children, minColWidth = 220, className = '' }: PageContentGridProps) {
    return (
        <div
            className={`px-4 py-4 grid gap-3 ${className}`.trim()}
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minColWidth}px, 1fr))` }}
        >
            {children}
        </div>
    );
}
