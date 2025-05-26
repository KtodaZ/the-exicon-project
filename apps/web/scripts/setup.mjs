import { MongoClient } from 'mongodb';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import convict from 'convict';

dotenv.config();

// Define the configuration schema (inline since we can't import from TypeScript)
const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  mongodb: {
    uri: {
      doc: 'MongoDB connection URI',
      format: String,
      default: '',
      env: 'MONGODB_URI',
      sensitive: true
    },
    database: {
      doc: 'MongoDB database name',
      format: String,
      default: 'exicon',
      env: 'MONGODB_DATABASE'
    }
  }
});

// Validate the configuration
config.validate({ allowed: 'strict' });

const setup = async () => {
  // Skip database setup in production environments
  if (config.get('env') === 'production') {
    console.log('Skipping database setup in production environment');
    return;
  }
  
  // Check for MongoDB URI
  if (!config.get('mongodb.uri')) {
    console.warn('MONGODB_URI not found in environment variables. Skipping database setup.');
    return;
  }
  
  let client;

  try {
    client = new MongoClient(config.get('mongodb.uri'));
    await client.connect();

    const hasData = await client
      .db(config.get('mongodb.database'))
      .collection('users')
      .countDocuments();

    if (hasData) {
      console.log('Database already exists with data');
      client.close();
      return;
    }

    const records = [...Array(10)].map(() => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const username = faker.internet.userName({ firstName, lastName });
      const email = faker.internet.email({ firstName, lastName });
      const image = faker.image.avatar();

      return {
        name: `${firstName} ${lastName}`,
        username,
        email,
        image,
        followers: 0,
        emailVerified: null
      };
    });

    const insert = await client
      .db(config.get('mongodb.database'))
      .collection('users')
      .insertMany(records);

    if (insert.acknowledged) {
      console.log('Successfully inserted records');
    }
  } catch (error) {
    console.error('Database error:', error);
    return 'Database is not ready yet';
  } finally {
    if (client) {
      await client.close();
    }
  }
};

try {
  setup();
} catch (error) {
  console.warn('Database is not ready yet. Skipping seeding...', error);
}

export { setup };
