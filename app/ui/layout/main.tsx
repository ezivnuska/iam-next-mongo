// app/ui/main.tsx

export default function Main({ children }: { children: React.ReactNode }) {
    return <main className="flex grow flex-col py-2 px-5 max-[375px]:px-1">{children}</main>
}