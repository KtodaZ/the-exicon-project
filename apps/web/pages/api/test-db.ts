import type { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/mongodb';
import config from '@/lib/config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('Testing database connection...');
    
    // Test configuration
    const mongoUri = config.get('mongodb.uri');
    const dbName = config.get('mongodb.database');
    
    console.log('Config test:', {
      hasUri: !!mongoUri,
      uriPrefix: mongoUri ? mongoUri.substring(0, 20) + '...' : 'none',
      dbName,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Test database connection
    const db = await getDatabase();
    
    // Test a simple operation
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Test ping
    await db.command({ ping: 1 });
    
    return res.status(200).json({
      success: true,
      database: db.databaseName,
      collections: collectionNames,
      message: 'Database connection successful'
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      config: {
        hasUri: !!config.get('mongodb.uri'),
        dbName: config.get('mongodb.database'),
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
} 