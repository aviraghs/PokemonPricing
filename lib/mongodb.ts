import { MongoClient } from 'mongodb';

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

function getClientPromise(): Promise<MongoClient> {
  // Validate MONGO_URI only when actually connecting
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Please add your MONGO_URI to .env.local');
  }

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve the MongoClient across hot reloads
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, create a new client
    if (!client) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export default getClientPromise;

// Helper to get database and collections
export async function getDatabase() {
  const clientPromise = getClientPromise();
  const client = await clientPromise;
  const db = client.db('pokemon_cards');

  return {
    db,
    cardsCollection: db.collection('cards'),
    usersCollection: db.collection('users'),
  };
}
