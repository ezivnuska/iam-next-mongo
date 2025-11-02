// app/poker/page.tsx

import { PokerProvider } from '@/app/poker/lib/providers/poker-provider';
// import Poker from '@/app/poker/components/poker';
import PokerTable from '@/app/poker/components/poker-table';
import ProtectedRoute from '@/app/ui/auth/protected-route';
import ActionNotificationToast from '@/app/poker/components/action-notification-toast';

export default function PokerPage() {
  return (
    <ProtectedRoute>
        <PokerProvider>
            <ActionNotificationToast />
            <PokerTable />
        </PokerProvider>
    </ProtectedRoute>
  );
}
