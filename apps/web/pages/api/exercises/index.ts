import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllExercises, searchExercises, searchExercisesWithAtlas } from '@/lib/api/exercise';
import { auth } from '@/lib/auth';

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
      limit = '12',
      status = 'active', // Default to active exercises for public
      includeUserDrafts = false,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const tagsArray = Array.isArray(tags) 
      ? tags as string[] 
      : tags ? [tags as string] : [];

    console.log('Parsed parameters:', { query, tagsArray, pageNum, limitNum, status, includeUserDrafts });

    // Get session to determine user access level
    let session = null;
    try {
      session = await auth.api.getSession({
        headers: req.headers as any,
      });
    } catch (error) {
      console.log('No session found, using public access');
    }

    // Determine what exercises the user can see
    let allowedStatuses = ['active']; // Default: only active exercises

    if (session?.user) {
      // Check if user can view all exercises (admin/maintainer)
      const canViewAll = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            exercise: ["view-all"],
          },
        },
      });

      if (canViewAll?.success) {
        // Admin/maintainer can see all statuses
        allowedStatuses = ['draft', 'submitted', 'active', 'archived'];
      } else if (includeUserDrafts === 'true') {
        // Regular users can see their own drafts + active exercises
        allowedStatuses = ['active', 'draft'];
      }
    }

    // Filter status based on permissions
    const requestedStatus = status as string;
    let finalStatus = requestedStatus;

    if (!allowedStatuses.includes(requestedStatus)) {
      finalStatus = 'active'; // Fallback to active
    }

    if (query || tagsArray.length > 0) {
      console.log('Calling searchExercisesWithAtlas...');
      const result = await searchExercisesWithAtlas(
        query as string, 
        tagsArray,
        pageNum,
        limitNum,
        {
          status: finalStatus,
          userId: (includeUserDrafts === 'true' && session?.user) ? session.user.id : undefined,
          fuzzy: true,
        }
      );
      
      console.log('Search result:', { exerciseCount: result.exercises.length, totalCount: result.totalCount });
      return res.status(200).json(result);
    } else {
      console.log('Calling getAllExercises...');
      const result = await getAllExercises(pageNum, limitNum, {
        status: finalStatus,
        userId: (includeUserDrafts === 'true' && session?.user) ? session.user.id : undefined,
      });
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