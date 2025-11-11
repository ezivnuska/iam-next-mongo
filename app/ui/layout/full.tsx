// app/ui/full.tsx

export default function Full({ children }: { children: React.ReactNode }) {
    return <main className="flex grow flex-col py-2 px-3 max-[375px]:px-1">{children}</main>
}