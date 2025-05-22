import type { NextApiRequest, NextApiResponse } from 'next';
import { getExerciseBySlug } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { slug } = req.query;
    
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Invalid slug parameter' });
    }

    const exercise = await getExerciseBySlug(slug);
    
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    return res.status(200).json(exercise);
  } catch (error) {
    console.error(`API Error in /api/exercises/${req.query.slug}:`, error);
    return res.status(500).json({ 
      error: 'An error occurred while fetching the exercise' 
    });
  }
}