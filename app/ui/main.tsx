// app/ui/main.tsx

export default function Main({ children }: { children: React.ReactNode }) {
    return <main className="flex grow flex-col py-2 px-6 max-[375px]:px-2">{children}</main>
}