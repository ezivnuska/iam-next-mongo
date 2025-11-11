// app/ui/main.tsx

export default function Main({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex grow flex-col py-2 px-3 max-[375px]:px-1">
            {children}
        </div>
    )
}