// app/poker/page.tsx

import { PokerProvider } from '@/app/poker/lib/providers/poker-provider';
import PokerTable from '@/app/poker/components/poker-table';
import FullscreenPage from '../ui/layout/page/fullscreen-page';

export default function PokerPage() {
    return (
        <FullscreenPage className={`flex-col items-stretch bg-green-700`}>
            <PokerProvider>
                <PokerTable />
            </PokerProvider>
        </FullscreenPage>
    );
}
