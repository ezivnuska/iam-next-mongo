interface PageContentListProps {
    children: React.ReactNode;
    className?: string;
}

export default function PageContentList({ children, className = '' }: PageContentListProps) {
    return (
        <div className={`px-4 py-4 w-full max-w-content mx-auto ${className}`.trim()}>
            {children}
        </div>
    );
}
