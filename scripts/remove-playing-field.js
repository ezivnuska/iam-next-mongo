// scripts/remove-playing-field.js
// Run with: node scripts/remove-playing-field.js

const { MongoClient } = require('mongodb');

// Update this with your MongoDB connection string
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iameric';

async function removePlayingField() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('pokergames');

    // Remove the 'playing' field from all documents
    const result = await collection.updateMany(
      {},
      { $unset: { playing: "" } }
    );

    console.log(`✓ Updated ${result.modifiedCount} document(s)`);
    console.log(`✓ Matched ${result.matchedCount} document(s)`);

    // Verify by checking one document
    const sample = await collection.findOne({});
    console.log('\nSample document after cleanup:');
    console.log(JSON.stringify(sample, null, 2));

    if (sample && 'playing' in sample) {
      console.warn('⚠ WARNING: "playing" field still exists!');
    } else {
      console.log('✓ "playing" field successfully removed');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

removePlayingField();
