interface PageContentListProps {
    children: React.ReactNode;
    className?: string;
}

export default function PageContentList({ children, className = '' }: PageContentListProps) {
    return (
        <div className={`py-4 w-full max-w-content mx-auto ${className}`.trim()}>
            {children}
        </div>
    );
}
