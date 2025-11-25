// app/poker/page.tsx

import { PokerProvider } from '@/app/poker/lib/providers/poker-provider';
import PokerTable from '@/app/poker/components/poker-table';
import FullPage from '../ui/layout/page/full-page';

export default function PokerPage() {
  return (
    <PokerProvider>
      <FullPage bgColor='bg-green-700'>
        <PokerTable />
      </FullPage>
    </PokerProvider>
  );
}
