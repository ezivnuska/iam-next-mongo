interface PageContentRowProps {
    children: React.ReactNode;
    className?: string;
}

export default function PageContentRow({ children, className = '' }: PageContentRowProps) {
    return (
        <div className={`px-4 ${className}`.trim()}>
            {children}
        </div>
    );
}
