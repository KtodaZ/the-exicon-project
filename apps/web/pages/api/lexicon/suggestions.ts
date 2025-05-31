import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q: query, limit = '50', full = 'false' } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const searchLimit = Math.min(parseInt(limit as string) || 50, 100);
    const returnFullObjects = full === 'true';

    const db = await getDatabase();
    const lexiconCollection = db.collection('lexicon');

    let lexiconItems = [];

    const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    const regexFilter = {
      status: 'active',
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { 'aliases.name': searchRegex },
      ],
    };

    const projection = returnFullObjects 
      ? {}
      : { _id: 1, title: 1, urlSlug: 1, description: 1, aliases: 1 };

    lexiconItems = await lexiconCollection
      .find(regexFilter, { projection })
      .limit(searchLimit)
      .toArray();

    // Convert ObjectIds to strings
    const formattedItems = lexiconItems.map(item => ({
      ...item,
      _id: item._id.toString(),
    }));

    res.status(200).json({
      success: true,
      lexicon: formattedItems,
      query,
      count: formattedItems.length,
    });

  } catch (error) {
    console.error('Error in lexicon suggestions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      lexicon: [],
    });
  }
}