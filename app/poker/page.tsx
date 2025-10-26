// app/poker/page.tsx

import { PokerProvider } from '@/app/lib/providers/poker-provider';
import Poker from '@/app/ui/poker/poker';
import ProtectedRoute from '@/app/ui/auth/protected-route';

export default function PokerPage() {
  return (
    <ProtectedRoute>
        <PokerProvider>
            <Poker />
        </PokerProvider>
    </ProtectedRoute>
  );
}
