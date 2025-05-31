import type { NextApiRequest, NextApiResponse } from 'next';
import { getLexiconItemsByLetter } from '@/lib/api/lexicon';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('API /lexicon/by-letter called');

  try {
    const result = await getLexiconItemsByLetter();
    console.log('By-letter result:', { letterCount: Object.keys(result).length });
    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error in /api/lexicon/by-letter:', error);
    return res.status(500).json({
      error: 'An error occurred while fetching lexicon items by letter',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 