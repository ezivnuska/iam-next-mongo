// scripts/unlock-game.ts
// Quick script to unlock stuck poker games

import { PokerGame } from '../app/poker/lib/models/poker-game';
import mongoose from 'mongoose';

async function unlockAllGames() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/poker';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear all processing locks
    const result = await PokerGame.updateMany(
      { processing: true },
      { processing: false }
    );

    console.log(`✅ Unlocked ${result.modifiedCount} game(s)`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error unlocking games:', error);
    process.exit(1);
  }
}

unlockAllGames();
