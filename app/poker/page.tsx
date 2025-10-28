// app/poker/page.tsx

import { PokerProvider } from '@/app/lib/providers/poker-provider';
// import Poker from '@/app/ui/poker/poker';
import PokerTable from '@/app/ui/poker/poker-table';
import ProtectedRoute from '@/app/ui/auth/protected-route';
import ActionNotificationToast from '@/app/ui/poker/action-notification-toast';
import RestartTimerToast from '@/app/ui/poker/restart-timer-toast';

export default function PokerPage() {
  return (
    <ProtectedRoute>
        <PokerProvider>
            <ActionNotificationToast />
            <RestartTimerToast />
            <PokerTable />
        </PokerProvider>
    </ProtectedRoute>
  );
}
