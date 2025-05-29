import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mongodb: {
    uri: process.env.MONGODB_URI!,
    dbName: process.env.MONGODB_DB_NAME!,
    exerciseCollection: 'exercises',
    proposalCollection: 'cleanup_proposals'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    defaultModel: 'gpt-4o-mini',
    defaultMaxTokens: 500,
    defaultTemperature: 0.3
  },
  cleanup: {
    defaultBatchSize: 10,
    reviewRequired: true,
    autoApprove: false,
    autoApproveMinConfidence: 0.8
  }
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'MONGODB_DB_NAME', 'OPENAI_API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}