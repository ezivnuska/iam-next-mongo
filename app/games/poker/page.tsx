// app/poker/page.tsx

import { PokerProvider } from '@/app/games/poker/lib/providers/poker-provider';
import PokerTable from '@/app/games/poker/components/poker-table';

export default function PokerPage() {
    return (
        <PokerProvider>
            <PokerTable />
        </PokerProvider>
    );
}
