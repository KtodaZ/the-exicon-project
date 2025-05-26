import { MongoClient } from 'mongodb';
import config from './config';

const uri = config.get('mongodb.uri');
if (!uri) {
  console.error('MONGODB_URI is not defined in environment variables');
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
  const client = await clientPromise;
  return client.db(config.get('mongodb.database'));
};
