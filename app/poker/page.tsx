// app/poker/page.tsx

import { PokerProvider } from '@/app/lib/providers/poker-provider';
import PokerGame from '@/app/ui/poker/poker-game';
import ProtectedRoute from '@/app/ui/auth/protected-route';

export default function PokerPage() {
  return (
    <ProtectedRoute>
        <PokerProvider>
            <PokerGame />
        </PokerProvider>
    </ProtectedRoute>
  );
}
