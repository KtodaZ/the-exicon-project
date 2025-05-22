import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllExercises, searchExercises } from '@/lib/api/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

    if (query || tagsArray.length > 0) {
      const result = await searchExercises(
        query as string, 
        tagsArray,
        pageNum,
        limitNum
      );
      
      return res.status(200).json(result);
    } else {
      const result = await getAllExercises(pageNum, limitNum);
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('API Error in /api/exercises:', error);
    return res.status(500).json({ 
      error: 'An error occurred while fetching exercises' 
    });
  }
}