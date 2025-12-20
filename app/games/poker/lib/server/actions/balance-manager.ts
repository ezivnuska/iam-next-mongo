// app/games/poker/lib/server/actions/balance-manager.ts
// Player chip balance management and migration logic

import { PokerBalance } from '@/app/games/poker/lib/models/poker-balance';
import { POKER_GAME_CONFIG } from '@/app/games/poker/lib/config/poker-constants';

/**
 * Get player's chip balance or default starting chips
 * Handles:
 * - Guest players (no persistence)
 * - Migration from old chips array format to new chipCount format
 * - Validation and reset of insufficient balances
 *
 * @param userId - Player's user ID
 * @param isGuest - Whether the player is a guest
 * @returns Player's chip count
 */
export async function getPlayerBalanceOrDefault(
  userId: string,
  isGuest: boolean
): Promise<number> {
  // Guest players always start with default chips (no persistence)
  if (isGuest) {
    return POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;
  }

  let playerChipCount: number = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

  // Get or create balance ONCE before retry loop to avoid duplicate creation
  const balanceDoc = await PokerBalance.findOne({ userId }).lean();

  if (balanceDoc) {
    const balance = balanceDoc as any; // Use any for migration compatibility

    // Check if balance has the new chipCount field
    if (typeof balance.chipCount === 'number' && balance.chipCount > 0) {
      playerChipCount = balance.chipCount;
    } else if (balance.chips && Array.isArray(balance.chips)) {
      // Migrate from old chips array format
      const { getChipTotal } = await import('@/app/games/poker/lib/utils/poker');
      const oldChipTotal = getChipTotal(balance.chips);
      playerChipCount = oldChipTotal > 0 ? oldChipTotal : POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

      // Update the balance document to new format
      await PokerBalance.findOneAndUpdate(
        { userId },
        { $set: { chipCount: playerChipCount }, $unset: { chips: '' } }
      );
    } else {
      // Balance exists but has no chips, set to default
      await PokerBalance.findOneAndUpdate(
        { userId },
        { $set: { chipCount: playerChipCount } }
      );
    }
  } else {
    // Create new balance record with starting chips
    await PokerBalance.create({ userId, chipCount: playerChipCount });
  }

  // Reset balance to default if insufficient for big blind
  if (playerChipCount < POKER_GAME_CONFIG.BIG_BLIND) {
    playerChipCount = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

    // Update the balance in database
    await PokerBalance.findOneAndUpdate(
      { userId },
      { $set: { chipCount: playerChipCount } }
    );
  }

  return playerChipCount;
}
