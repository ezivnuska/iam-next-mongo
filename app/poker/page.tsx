// app/poker/page.tsx

import { PokerProvider } from '@/app/poker/lib/providers/poker-provider';
import PokerTable from '@/app/poker/components/poker-table';

export default function PokerPage() {
    return (
        <main className={`flex flex-1 grow flex-col items-stretch bg-green-700`}>
            <PokerProvider>
                <PokerTable />
            </PokerProvider>
        </main>
    );
}
