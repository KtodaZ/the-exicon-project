import type { NextApiRequest, NextApiResponse } from 'next';
import { getSearchSuggestions } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q: query = '', limit = '5' } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 20) {
      return res.status(400).json({ error: 'Limit must be between 1 and 20' });
    }

    const suggestions = await getSearchSuggestions(query, limitNum);
    
    return res.status(200).json({ 
      suggestions,
      query: query.trim(),
      count: suggestions.length
    });
  } catch (error) {
    console.error('API Error in /api/exercises/suggestions:', error);
    return res.status(500).json({ 
      error: 'An error occurred while fetching suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}