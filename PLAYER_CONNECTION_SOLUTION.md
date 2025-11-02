# Player Disconnection Solution
## Handling players who navigate away during active games

---

## Problem Statement

When a player navigates away from the poker page (closes tab, goes to another page, loses connection), they remain in the game but cannot take actions, which stalls gameplay for other players.

---

## Solution Overview

A multi-layered approach combining:

1. **Client-side connection monitoring** - Detects when players leave
2. **Heartbeat system** - Tracks active connections
3. **Auto-fold mechanism** - Folds disconnected players automatically
4. **Visual indicators** - Shows connection status to all players
5. **Graceful reconnection** - Allows players to rejoin seamlessly

---

## Architecture

### 1. Client-Side Monitoring

**File**: `app/poker/lib/hooks/use-player-connection-monitor.ts`

Monitors:
- Page visibility changes (tab switch, minimize)
- Browser navigation (beforeunload event)
- Sends heartbeat every 10 seconds

```tsx
usePlayerConnectionMonitor({
  gameId,
  isUserInGame,
  isMyTurn,
  onDisconnect: () => console.log('Player left'),
  onReconnect: () => console.log('Player returned'),
});
```

### 2. Heartbeat API

**File**: `app/api/poker/heartbeat/route.ts`

- Receives heartbeat every 10s from active players
- Updates `lastHeartbeat` timestamp in player document
- Tracks last known activity time

### 3. Connection Status Component

**File**: `app/poker/components/player-connection-status.tsx`

Visual indicator showing:
- 🟢 **Green**: Connected (heartbeat <15s ago)
- 🟡 **Yellow**: Reconnecting (15-30s ago)
- 🔴 **Red**: Disconnected (>30s ago)
- ⚪ **Gray**: Unknown (no heartbeat data)

### 4. Auto-Fold System

**File**: `app/poker/lib/server/connection-manager.ts`

- Checks for disconnected players every 10s
- Auto-folds if:
  - It's their turn
  - No heartbeat for >30s
  - No action timer OR timer expired
- Advances to next player
- Notifies all players in game

---

## Connection States & Timeframes

| State | Time Since Last Heartbeat | Action |
|-------|---------------------------|--------|
| **Connected** | 0-15s | Normal gameplay |
| **Reconnecting** | 15-30s | Show warning indicator |
| **Disconnected** | 30s+ | Auto-fold on their turn |

---

## Implementation Steps

### Step 1: Add lastHeartbeat to Player Model

Update your player type definition:

```typescript
// app/poker/lib/definitions/poker.ts
export interface Player {
  id: string;
  username: string;
  hand: Card[];
  chips: Chip[];
  lastHeartbeat?: Date; // Add this field
  folded?: boolean;
}
```

### Step 2: Integrate Connection Monitor in Provider

```tsx
// app/poker/lib/providers/poker-provider.tsx
import { usePlayerConnectionMonitor } from '../hooks/use-player-connection-monitor';
import { useSocket } from '@/app/lib/providers/socket-provider';

export function PokerProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { user } = useUser();

  // ... existing state ...

  const isUserInGame = user && players.some(p => p.id === user.id);
  const isMyTurn = user && players[currentPlayerIndex]?.id === user.id;

  // Add connection monitoring
  usePlayerConnectionMonitor({
    gameId,
    isUserInGame: !!isUserInGame,
    isMyTurn: !!isMyTurn,
    onDisconnect: () => {
      console.log('You disconnected from the game');
    },
    onReconnect: () => {
      console.log('You reconnected to the game');
      // Refresh game state
      fetchCurrentGame(gameId);
    },
  });

  // ... rest of provider ...
}
```

### Step 3: Add Connection Status to Player Component

```tsx
// app/poker/components/player.tsx
import PlayerConnectionStatus from './player-connection-status';

export default function Player({ player, isCurrentPlayer, ... }) {
  return (
    <li>
      {/* Existing player UI */}

      {/* Add connection indicator */}
      <PlayerConnectionStatus
        playerId={player.id}
        lastHeartbeat={player.lastHeartbeat}
        isCurrentPlayer={isCurrentPlayer}
      />

      {/* Rest of player UI */}
    </li>
  );
}
```

### Step 4: Set Up Background Monitor (Optional)

Create a background job to monitor disconnections:

```typescript
// app/api/poker/monitor-connections/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongodb';
import { monitorDisconnectedPlayers } from '@/app/poker/lib/server/connection-manager';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    await monitorDisconnectedPlayers(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Monitor error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

Set up a cron job or use Vercel Cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/poker/monitor-connections",
    "schedule": "*/10 * * * *"
  }]
}
```

---

## User Experience Flow

### Scenario 1: Player Closes Tab During Their Turn

1. **T+0s**: Player closes browser tab
2. **T+0s**: `beforeunload` event shows warning (browser-level)
3. **T+10s**: First missed heartbeat
4. **T+15s**: Status changes to "Reconnecting" (yellow indicator)
5. **T+30s**: Status changes to "Disconnected" (red indicator)
6. **T+30s**: Auto-fold triggered, game continues with next player
7. **T+30s**: Notification: "PlayerName was auto-folded (disconnected)"

### Scenario 2: Player Switches Tabs Then Returns

1. **T+0s**: Player switches to another tab
2. **T+0s**: Page visibility changes to hidden
3. **T+0-30s**: Heartbeats continue (browser may throttle)
4. **T+5s**: Player returns to poker tab
5. **T+5s**: Page visibility changes to visible
6. **T+5s**: Reconnection detected, game state refreshed
7. Player continues normally (no auto-fold)

### Scenario 3: Player Loses Internet Connection

1. **T+0s**: Internet disconnects
2. **T+0s**: Socket disconnects, UI shows "Disconnected" in socket status
3. **T+10s**: Heartbeat fails (no network)
4. **T+30s**: Auto-fold triggered on server
5. **T+45s**: Internet reconnects
6. **T+45s**: Socket reconnects, game state syncs
7. Player sees they've been folded and game has continued

---

## Advanced Features

### 1. Reconnection Buffer

Allow 30 seconds for player to return before auto-folding:

```typescript
const RECONNECTION_GRACE_PERIOD = 30000; // 30 seconds

if (timeSinceDisconnect < RECONNECTION_GRACE_PERIOD) {
  // Don't auto-fold yet, give them time to reconnect
  return;
}
```

### 2. Toast Notifications

Show reconnection status:

```tsx
// When player reconnects
toast.success('Reconnected to game!');

// When another player disconnects
toast.warning('PlayerName disconnected');
```

### 3. Pause Game for Disconnections

Instead of auto-folding, pause the game:

```typescript
if (isPlayerDisconnected(currentPlayer)) {
  game.paused = true;
  game.pauseReason = `Waiting for ${currentPlayer.username} to reconnect...`;

  // Resume after timeout or when player reconnects
}
```

### 4. Kick After Multiple Disconnections

Track disconnect count and remove repeat offenders:

```typescript
player.disconnectCount = (player.disconnectCount || 0) + 1;

if (player.disconnectCount >= 3) {
  // Remove player from game entirely
  removePlayerFromGame(game, player.id);
}
```

---

## Testing Checklist

- [ ] Player closes tab during their turn → auto-folded after 30s
- [ ] Player switches tabs briefly → returns without issue
- [ ] Player loses internet → auto-folded, can rejoin after reconnection
- [ ] Multiple players disconnect → game continues with remaining players
- [ ] Connection indicators show correct status (green/yellow/red)
- [ ] Warning shown before leaving during player's turn
- [ ] Heartbeat updates every 10 seconds
- [ ] Auto-fold respects action timer (doesn't fold before timer expires)

---

## Configuration Options

```typescript
// Adjust these values based on your needs

// How often to send heartbeats
const HEARTBEAT_INTERVAL = 10000; // 10 seconds

// How long until considered disconnected
const DISCONNECT_THRESHOLD = 30000; // 30 seconds

// How long to show reconnecting status
const RECONNECTING_THRESHOLD = 15000; // 15 seconds

// How often to check for disconnected players (server-side)
const MONITOR_INTERVAL = 10000; // 10 seconds
```

---

## Performance Considerations

1. **Heartbeat Frequency**: 10s is reasonable balance between accuracy and server load
2. **Batch Updates**: Monitor job checks all games in one query
3. **Indexed Queries**: Ensure `code` and `locked` fields are indexed
4. **Cleanup**: Remove old heartbeat data periodically

---

## Security Considerations

1. **Authentication**: Heartbeat endpoint requires valid session
2. **Rate Limiting**: Prevent heartbeat spam
3. **Validation**: Verify player is actually in the game
4. **Atomic Updates**: Use MongoDB atomic operators to prevent race conditions

---

## Alternatives Considered

### Option 1: Socket Disconnect = Auto-Fold (Too Aggressive)
- **Pros**: Immediate response
- **Cons**: Network hiccups cause unnecessary folds

### Option 2: Manual Kick by Other Players (Too Manual)
- **Pros**: Player control
- **Cons**: Requires UI, can be abused

### Option 3: Pause Game Until Return (Too Disruptive)
- **Pros**: Fair to disconnected player
- **Cons**: One player can stall entire game

### ✅ **Chosen: Heartbeat + Auto-Fold After Timeout**
- **Pros**: Balanced, automatic, graceful
- **Cons**: 30s delay (acceptable trade-off)

---

## Migration Path

If you have existing games, add `lastHeartbeat` field:

```typescript
// One-time migration
db.collection('poker_games').updateMany(
  {},
  {
    $set: {
      'players.$[].lastHeartbeat': new Date()
    }
  }
);
```

---

## Summary

This solution provides:
- ✅ Automatic detection of player disconnections
- ✅ Visual feedback to all players
- ✅ Graceful auto-fold after reasonable timeout
- ✅ Seamless reconnection experience
- ✅ No manual intervention required
- ✅ Works across all disconnect scenarios

The 30-second grace period balances between:
- Not stalling the game indefinitely
- Giving players time to recover from brief network issues
- Maintaining fair gameplay for all participants
