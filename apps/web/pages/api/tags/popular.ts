import type { NextApiRequest, NextApiResponse } from 'next';
import { getPopularTags } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    
    const popularTags = await getPopularTags(limitNum);
    
    return res.status(200).json(popularTags);
  } catch (error) {
    console.error('API Error in /api/tags/popular:', error);
    return res.status(500).json({ 
      error: 'An error occurred while fetching popular tags' 
    });
  }
}