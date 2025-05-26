import convict from 'convict';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define the configuration schema
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
      default: 'Cluster0',
      env: 'MONGODB_DATABASE'
    }
  }
});

// Validate the configuration
config.validate({ allowed: 'strict' });

export default config; 