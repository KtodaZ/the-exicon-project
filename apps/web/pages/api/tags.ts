import type { NextApiRequest, NextApiResponse } from 'next';
import { getPopularTags } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = 100 } = req.query;
    
    const tags = await getPopularTags(parseInt(limit as string, 10));
    
    res.status(200).json({
      success: true,
      tags: tags.map(tag => tag.tag), // Return just the tag names
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ 
      error: 'An error occurred while fetching tags',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 