import type { NextApiRequest, NextApiResponse } from 'next';
import { searchLexiconItems } from '@/lib/api/lexicon';
import { searchExercises } from '@/lib/api/exercise';
import { CombinedSearchResult } from '@/types/search';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CombinedSearchResult | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    // Search both lexicon and exercises in parallel
    const [lexiconResults, exerciseResults] = await Promise.all([
      searchLexiconItems(query.trim(), 1, 5), // Max 5 lexicon results
      searchExercises(query.trim(), [], 1, 5, { status: 'active' }) // Max 5 exercise results
    ]);

    // Format lexicon results
    const lexiconItems = lexiconResults.items.map(item => ({
      ...item,
      type: 'lexicon' as const
    }));

    // Format exercise results
    const exerciseItems = exerciseResults.exercises.map(exercise => ({
      _id: exercise._id,
      name: exercise.name,
      description: exercise.description,
      slug: exercise.urlSlug,
      type: 'exercise' as const
    }));

    const result: CombinedSearchResult = {
      lexicon: {
        items: lexiconItems,
        totalCount: lexiconResults.totalCount
      },
      exercises: {
        items: exerciseItems,
        totalCount: exerciseResults.totalCount
      }
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in combined search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 