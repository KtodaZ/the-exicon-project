import type { NextApiRequest, NextApiResponse } from 'next';
import { getLexiconItemBySlug } from '@/lib/api/lexicon';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;
  
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug parameter' });
  }

  console.log('API /lexicon/[slug] called with slug:', slug);

  try {
    const item = await getLexiconItemBySlug(slug);
    
    if (!item) {
      return res.status(404).json({ error: 'Lexicon item not found' });
    }

    console.log('Found lexicon item:', item.title);
    return res.status(200).json(item);
  } catch (error) {
    console.error('API Error in /api/lexicon/[slug]:', error);
    return res.status(500).json({
      error: 'An error occurred while fetching the lexicon item',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 