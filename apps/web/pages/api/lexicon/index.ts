import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllLexiconItems, searchLexiconItems } from '@/lib/api/lexicon';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('API /lexicon called with query:', req.query);

  try {
    const {
      query = '',
      page = '1',
      limit = '24',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const searchQuery = query as string;

    console.log('Parsed parameters:', { searchQuery, pageNum, limitNum });

    if (searchQuery && searchQuery.trim()) {
      console.log('Calling searchLexiconItems...');
      const result = await searchLexiconItems(searchQuery.trim(), pageNum, limitNum);
      console.log('Search result:', { itemCount: result.items.length, totalCount: result.totalCount });
      return res.status(200).json(result);
    } else {
      console.log('Calling getAllLexiconItems...');
      const result = await getAllLexiconItems(pageNum, limitNum);
      console.log('GetAll result:', { itemCount: result.items.length, totalCount: result.totalCount });
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('API Error in /api/lexicon:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({
      error: 'An error occurred while fetching lexicon items',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 