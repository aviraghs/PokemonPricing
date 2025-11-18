/**
 * Database Indexes Migration Script
 *
 * This script creates necessary indexes to optimize database query performance.
 * Run this script once against your MongoDB database to create all required indexes.
 *
 * Usage:
 *   node scripts/create-indexes.js
 *
 * Or connect to MongoDB shell and run the commands manually.
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pokemon-pricing';

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Create indexes for cards collection
    console.log('\n📊 Creating indexes for cards collection...');
    const cardsCollection = db.collection('cards');

    // Index for finding user's cards quickly
    await cardsCollection.createIndex({ userId: 1 });
    console.log('✅ Created index: cards.userId');

    // Compound index for checking if card exists in collection
    await cardsCollection.createIndex({
      userId: 1,
      setId: 1,
      cardNumber: 1,
      language: 1
    });
    console.log('✅ Created index: cards.userId_setId_cardNumber_language');

    // Index for card ID lookup
    await cardsCollection.createIndex({ cardId: 1 });
    console.log('✅ Created index: cards.cardId');

    // Index for sorting by creation date
    await cardsCollection.createIndex({ createdAt: -1 });
    console.log('✅ Created index: cards.createdAt');

    // Create indexes for users collection
    console.log('\n📊 Creating indexes for users collection...');
    const usersCollection = db.collection('users');

    // Unique index for email
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Created index: users.email (unique)');

    // Unique index for username
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    console.log('✅ Created index: users.username (unique)');

    console.log('\n✅ All indexes created successfully!');
    console.log('\n📋 Index Summary:');
    console.log('  Cards collection:');
    console.log('    - userId');
    console.log('    - userId + setId + cardNumber + language (compound)');
    console.log('    - cardId');
    console.log('    - createdAt');
    console.log('  Users collection:');
    console.log('    - email (unique)');
    console.log('    - username (unique)');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  createIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createIndexes };
