# Mobile Layout Optimization Guide
## iPhone SE (375×667) - Portrait & Landscape

---

## Layout Breakdown

### Portrait Mode (375w × 667h)
```
┌─────────────────────────────────────┐ 375px wide
│  Players List (scrollable)          │ ~230px (35vh)
│  ┌──────────────────────────────┐   │
│  │ Player 1                      │   │
│  │ Player 2 (You - highlighted) │   │
│  │ Player 3                      │   │
│  └──────────────────────────────┘   │
├─────────────────────────────────────┤
│  Notifications/Turn Status           │ ~48px (fixed)
├─────────────────────────────────────┤
│  Pot: $500                           │ ~40px (compact)
├─────────────────────────────────────┤
│  Communal Cards                      │ ~200px (flexible)
│  [K♥] [Q♠] [J♦] [10♣] [9♥]         │
├─────────────────────────────────────┤
│  Action Controls (when your turn)    │ ~149px (when visible)
│  [Check] [Bet/Raise] [Fold]         │
└─────────────────────────────────────┘
Total: ~667px
```

### Landscape Mode (667w × 375h)
```
┌──────────┬────────────────────────────────────────────────┐
│ Players  │  Game Area                                     │ 375px tall
│ (scroll) │                                                │
│┌────────┐│  Notifications/Turn Status      (48px)        │
││Player 1││  ────────────────────────────────────────────  │
││        ││                                                │
││Player 2││  Pot: $500                      (40px)        │
││ (You)  ││  ────────────────────────────────────────────  │
││        ││                                                │
││Player 3││  Communal Cards                 (flexible)    │
││        ││  [K♥] [Q♠] [J♦] [10♣] [9♥]                   │
│└────────┘│  ────────────────────────────────────────────  │
│          │                                                │
│  ~112px  │  Action Controls                (when visible)│
│  (7rem)  │  [Check] [Bet/Raise] [Fold]                   │
└──────────┴────────────────────────────────────────────────┘
           667px wide
```

---

## Key Optimizations

### 1. **Orientation-Aware Layout**
```tsx
// Use Tailwind's arbitrary variant for orientation
<div className="flex flex-col landscape:flex-row">
  {/* Vertical in portrait, horizontal in landscape */}
</div>
```

### 2. **Height Management**
```tsx
// Portrait: Limit player list to 35% viewport height
portrait:max-h-[35vh]

// Landscape: Use full height but constrain width
landscape:w-28 landscape:min-w-[7rem]

// Enable scrolling when needed
overflow-y-auto
```

### 3. **Spacing Efficiency**
```tsx
// Tight gaps (4px = 1 unit)
gap-1 p-1

// Fixed heights for predictable layout
flex-none    // Don't grow/shrink
flex-1       // Take available space
min-h-0      // Allow shrinking below content size
```

### 4. **Component Compactness**
- **NotificationArea**: Fixed `h-12` (48px)
- **Pot**: Minimal padding `py-1` (8px total)
- **CommunalCards**: Flexible, scales cards to fit
- **PlayerControls**: Compact buttons with minimal text

---

## Implementation Steps

### Step 1: Replace PokerTable
```tsx
// In app/poker/page.tsx
import PokerTableOptimized from '@/app/poker/components/poker-table-optimized';

// Replace <PokerTable /> with:
<PokerTableOptimized />
```

### Step 2: Add Tailwind Config (if orientation variants don't work)
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      screens: {
        'portrait': { 'raw': '(orientation: portrait)' },
        'landscape': { 'raw': '(orientation: landscape)' },
      },
    },
  },
}
```

### Step 3: Test Responsive Breakpoints
- **iPhone SE Portrait**: 375×667 ✓
- **iPhone SE Landscape**: 667×375 ✓
- **Tablet Portrait**: Should still work
- **Desktop**: Falls back to larger layout

---

## Space Allocation

### Portrait (667px height)
| Component           | Height  | Priority |
|---------------------|---------|----------|
| Players List        | ~230px  | Scrollable |
| Notifications       | 48px    | Fixed |
| Pot                 | 40px    | Fixed |
| Communal Cards      | ~200px  | Flexible |
| Action Controls     | ~149px  | Conditional |
| **Total**           | **667px** | |

### Landscape (375px height)
| Component           | Height  | Priority |
|---------------------|---------|----------|
| Notifications       | 48px    | Fixed |
| Pot                 | 40px    | Fixed |
| Communal Cards      | ~180px  | Flexible |
| Action Controls     | ~107px  | Conditional |
| **Total**           | **375px** | |

---

## Additional Optimizations

### Player Component Improvements
```tsx
// Make player cards more compact in landscape
<li className="landscape:py-0.5 portrait:py-1">
  {/* Reduce avatar size in landscape */}
  <UserAvatar size={isLandscape ? 36 : 44} />
</li>
```

### Card Size Adjustments
```tsx
// Scale cards based on available space
<Card
  className="landscape:max-h-20 portrait:max-h-24"
  // Smaller cards in landscape due to height constraints
/>
```

### Font Size Scaling
```tsx
// Use smaller text in landscape
<span className="landscape:text-sm portrait:text-base">
  Player Name
</span>
```

---

## Testing Checklist

- [ ] Portrait: All components visible without scrolling (except players)
- [ ] Landscape: No vertical overflow
- [ ] Players list scrollable in both orientations
- [ ] Action controls fully visible when it's user's turn
- [ ] Cards properly sized and not overlapping
- [ ] Touch targets at least 44×44px (iOS guideline)
- [ ] Text readable at all sizes
- [ ] Smooth orientation change (no layout breaks)

---

## Performance Considerations

1. **Avoid Re-renders**: Use `memo()` on all components
2. **CSS-Only Responsiveness**: No JS orientation detection needed
3. **Fixed Heights**: Prevent layout shifts during gameplay
4. **GPU-Accelerated Animations**: Use `transform` for card movements

---

## Fallback Strategy

If landscape mode is too cramped:
```tsx
// Hide less critical info in landscape
<div className="landscape:hidden">
  <ActionHistoryDisplay />
</div>
```

Or use a modal/overlay for player list:
```tsx
<button className="landscape:block portrait:hidden">
  Show Players (3)
</button>
```
