import convict from 'convict';

// Only load dotenv in development (Vercel injects env vars directly)
if (process.env.NODE_ENV === 'development') {
  const dotenv = require('dotenv');
  dotenv.config();
}

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
      default: 'exicon',
      env: 'MONGODB_DATABASE'
    }
  }
});

// Perform validation but don't use strict mode to allow for missing optional vars
try {
  config.validate({ allowed: 'warn' });
} catch (error) {
  console.error('Configuration validation error:', error);
  // In production, we might want to continue with warnings rather than failing
  if (process.env.NODE_ENV !== 'production') {
    throw error;
  }
}

export default config; 