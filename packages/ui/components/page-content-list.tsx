interface PageContentListProps {
    children: React.ReactNode;
    className?: string;
}

export default function PageContentList({ children, className = '' }: PageContentListProps) {
    return (
        <div className={`flex flex-col flex-1 min-h-0 py-4 w-full max-w-content mx-auto ${className}`.trim()}>
            {children}
        </div>
    );
}
