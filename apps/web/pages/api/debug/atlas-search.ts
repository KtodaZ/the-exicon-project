import type { NextApiRequest, NextApiResponse } from 'next';
import { debugAtlasSearch } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const debugInfo = await debugAtlasSearch();
    return res.status(200).json(debugInfo);
  } catch (error) {
    console.error('API Error in /api/debug/atlas-search:', error);
    return res.status(500).json({ 
      error: 'An error occurred during debug',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}