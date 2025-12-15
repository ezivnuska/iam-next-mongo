// app/ui/page-content.tsx

interface PageContentProps {
    children: React.ReactNode;
}

export default function PageContent({ children }: PageContentProps) {
    return (
        <div className={`flex flex-1 flex-col h-full max-w-[600px] py-5 px-4`}>
            {children}
        </div>
    );
}
