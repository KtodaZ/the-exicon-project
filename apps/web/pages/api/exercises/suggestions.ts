import type { NextApiRequest, NextApiResponse } from 'next';
import { getSearchSuggestions } from '@/lib/api/exercise';
import { getDatabase } from '@/lib/mongodb';

interface ExerciseSuggestion {
  _id: string;
  name: string;
  urlSlug: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q: query = '', limit = '5', full = 'false' } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }

    // If full=true, return full exercise objects for autocomplete using Atlas Search
    if (full === 'true') {
      const { searchExercisesWithAtlas } = await import('@/lib/api/exercise');
      
      try {
        // Use the same Atlas Search that powers the main search
        const searchResults = await searchExercisesWithAtlas(
          query.trim(),
          [], // no tag filters
          1, // page 1
          limitNum, // limit
          { status: 'active' } // only active exercises
        );

        // Transform results to our expected format
        const exercises: ExerciseSuggestion[] = searchResults.exercises.map(exercise => ({
          _id: exercise._id,
          name: exercise.name,
          urlSlug: exercise.urlSlug
        }));

        return res.status(200).json({
          success: true,
          exercises,
          query: query.trim(),
          count: exercises.length
        });
      } catch (error) {
        console.error('Atlas Search failed for suggestions, falling back to regex:', error);
        
        // Fallback to regex search if Atlas Search fails
        const db = await getDatabase();
        const collection = db.collection('exercises');
        
        const exercises = await collection.find({
          $and: [
            { status: 'active' },
            {
              $or: [
                { name: { $regex: new RegExp(query.trim(), 'i') } },
                { 'aliases.name': { $regex: new RegExp(query.trim(), 'i') } }
              ]
            }
          ]
        })
        .sort({ name: 1 })
        .limit(limitNum)
        .project<ExerciseSuggestion>({
          _id: 1,
          name: 1,
          urlSlug: 1
        })
        .toArray();

        return res.status(200).json({
          success: true,
          exercises: exercises as ExerciseSuggestion[],
          query: query.trim(),
          count: exercises.length
        });
      }
    }

    // Default behavior: return just exercise names
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