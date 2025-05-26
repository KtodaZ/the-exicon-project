import type { NextApiRequest, NextApiResponse } from 'next';
import { getPopularTags } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('API /tags/popular called with query:', req.query);
  
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    
    console.log('Calling getPopularTags with limit:', limitNum);
    const popularTags = await getPopularTags(limitNum);
    
    console.log('Popular tags result:', { tagCount: popularTags.length });
    return res.status(200).json(popularTags);
  } catch (error) {
    console.error('API Error in /api/tags/popular:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ 
      error: 'An error occurred while fetching popular tags',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}