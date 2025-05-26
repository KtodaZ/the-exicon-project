import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllExercises, searchExercises } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('API /exercises called with query:', req.query);
  
  try {
    const { 
      query = '', 
      tags = [], 
      page = '1', 
      limit = '12' 
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const tagsArray = Array.isArray(tags) 
      ? tags as string[] 
      : tags ? [tags as string] : [];

    console.log('Parsed parameters:', { query, tagsArray, pageNum, limitNum });

    if (query || tagsArray.length > 0) {
      console.log('Calling searchExercises...');
      const result = await searchExercises(
        query as string, 
        tagsArray,
        pageNum,
        limitNum
      );
      
      console.log('Search result:', { exerciseCount: result.exercises.length, totalCount: result.totalCount });
      return res.status(200).json(result);
    } else {
      console.log('Calling getAllExercises...');
      const result = await getAllExercises(pageNum, limitNum);
      console.log('GetAll result:', { exerciseCount: result.exercises.length, totalCount: result.totalCount });
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('API Error in /api/exercises:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ 
      error: 'An error occurred while fetching exercises',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}