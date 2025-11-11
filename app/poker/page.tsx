// app/poker/page.tsx

import { PokerProvider } from '@/app/poker/lib/providers/poker-provider';
import PokerTable from '@/app/poker/components/poker-table';
import ProtectedRoute from '@/app/ui/auth/protected-route';
import FullPage from '../ui/layout/page/full-page';

export default function PokerPage() {
  return (
    <ProtectedRoute>
        <PokerProvider>
            <FullPage>
                <PokerTable />
            </FullPage>
        </PokerProvider>
    </ProtectedRoute>
  );
}
