import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug, preview = 'false' } = req.query;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Slug parameter is required' });
    }

    const isPreview = preview === 'true';
    
    const db = await getDatabase();
    const lexiconCollection = db.collection('lexicon');

    // Find the lexicon item by slug
    const lexiconItem = await lexiconCollection.findOne({
      urlSlug: slug,
      status: 'active', // Only return active lexicon items
    });

    if (!lexiconItem) {
      return res.status(404).json({ 
        success: false,
        error: 'Lexicon term not found' 
      });
    }

    // Return different data based on preview mode
    let responseData;
    
    if (isPreview) {
      // Minimal data for tooltips and previews
      responseData = {
        _id: lexiconItem._id.toString(),
        title: lexiconItem.title,
        description: lexiconItem.description,
        urlSlug: lexiconItem.urlSlug,
      };
    } else {
      // Full data for detail pages
      responseData = {
        ...lexiconItem,
        _id: lexiconItem._id.toString(),
      };
    }

    res.status(200).json({
      success: true,
      lexicon: responseData,
    });

  } catch (error) {
    console.error('Error fetching lexicon by slug:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
}