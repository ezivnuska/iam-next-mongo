// app/ui/poker/pot.tsx

'use client';

import { usePoker } from '@/app/lib/providers/poker-provider';
import { getPotTotal } from '@/app/lib/utils/poker';

export default function Pot() {
  const { pot } = usePoker();
  const total = getPotTotal(pot);

  return (
    <div id="pot">
      ${total}
    </div>
  );
}
