import { MongoClient } from 'mongodb';
import config from './config';

const uri = config.get('mongodb.uri');
const databaseName = config.get('mongodb.database');

console.log('MongoDB configuration:', {
  hasUri: !!uri,
  databaseName,
  nodeEnv: process.env.NODE_ENV
});

if (!uri) {
  console.error('MONGODB_URI is not defined in environment variables');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('MONGO')));
}

const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
};

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    console.log('Creating new MongoDB client in development mode');
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect()
      .then(client => {
        console.log('MongoDB connected successfully in development mode');
        return client;
      })
      .catch(err => {
        console.error('Failed to connect to MongoDB in development mode:', err);
        throw err;
      });
  } else {
    console.log('Reusing existing MongoDB client in development mode');
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  console.log('Creating new MongoDB client in production mode');
  const client = new MongoClient(uri, options);
  clientPromise = client.connect()
    .then(client => {
      console.log('MongoDB connected successfully in production mode');
      return client;
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB in production mode:', err);
      throw err;
    });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Export a helper function to get the configured database
export const getDatabase = async () => {
  try {
    const client = await clientPromise;
    const db = client.db(databaseName);
    console.log('Successfully connected to database:', db.databaseName);
    return db;
  } catch (error) {
    console.error('Error getting database:', error);
    console.error('MongoDB URI exists:', !!uri);
    console.error('Database name:', databaseName);
    throw error;
  }
};
