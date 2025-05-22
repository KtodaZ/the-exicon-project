import type { NextApiRequest, NextApiResponse } from 'next';
import { checkExerciseCollection } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const result = await checkExerciseCollection();
    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error in /api/diagnostic:', error);
    return res.status(500).json({ 
      error: 'An error occurred while checking the database',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}