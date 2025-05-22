import type { NextApiRequest, NextApiResponse } from 'next';
import { checkExerciseCollection } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check if the exercise collection exists and has data
    const result = await checkExerciseCollection();
    
    // Return the result
    return res.status(200).json({
      ...result,
      message: result.exists 
        ? `Collection exists with ${result.count} documents` 
        : 'Collection does not exist'
    });
  } catch (error) {
    console.error('API Error in /api/debug/db-check:', error);
    return res.status(500).json({ 
      error: 'An error occurred while checking the database',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 