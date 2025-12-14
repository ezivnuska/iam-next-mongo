// app/poker/page.tsx

import { PokerProvider } from '@/app/games/poker/lib/providers/poker-provider';
import PokerTable from '@/app/games/poker/components/poker-table';
import FullscreenPage from '../../ui/layout/page/fullscreen-page';

export default function PokerPage() {
    return (
        <FullscreenPage className={`absolute top-0 left-0 right-0 bottom-0 flex-col items-stretch bg-green-700`}>
            <PokerProvider>
                <PokerTable />
            </PokerProvider>
        </FullscreenPage>
    );
}
