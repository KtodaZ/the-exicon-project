import type { NextApiRequest, NextApiResponse } from 'next';
import { getAllExercises, searchExercisesWithAtlas } from '@/lib/api/exercise';
import { auth } from '@/lib/auth';

// Helper function to remove markdown formatting
function removeMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove line breaks and normalize spaces
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to escape CSV fields
function escapeCsvField(field: any): string {
  // Convert to string and handle null/undefined
  const fieldStr = field == null ? '' : String(field);
  
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (fieldStr.includes(',') || fieldStr.includes('\n') || fieldStr.includes('"')) {
    return `"${fieldStr.replace(/"/g, '""')}"`;
  }
  
  return fieldStr;
}

// Helper function to convert exercise to CSV row
function exerciseToCsvRow(exercise: any): string {
  const fields = [
    exercise.name || '',
    removeMarkdown(exercise.description || ''),
    removeMarkdown(exercise.text || ''),
    exercise.tags?.join('; ') || '',
    exercise.difficulty || '',
    exercise.quality || '',
    exercise.confidence || '',
    exercise.author || '',
    exercise.urlSlug || '',
    exercise.postURL || '',
    exercise.video_url || '',
    exercise.image_url || '',
    exercise.status || '',
    exercise.submittedBy || '',
    exercise.approvedBy || '',
    new Date(exercise.createdAt?.$date?.$numberLong ? parseInt(exercise.createdAt.$date.$numberLong) : exercise.createdAt || Date.now()).toISOString().split('T')[0],
    new Date(exercise.updatedAt?.$date?.$numberLong ? parseInt(exercise.updatedAt.$date.$numberLong) : exercise.updatedAt || Date.now()).toISOString().split('T')[0]
  ];

  return fields.map(escapeCsvField).join(',');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      query = '',
      tags = [],
      status = 'active',
      includeUserDrafts = false,
      type = 'filtered' // 'filtered' or 'all'
    } = req.query;

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

    const tagsArray = Array.isArray(tags)
      ? tags as string[]
      : tags ? [tags as string] : [];

    let exercises = [];

    if (type === 'all') {
      // Download all exercises (ignoring current filters)
      const result = await getAllExercises(1, 10000, { // Large limit to get all
        status: finalStatus,
        userId: (includeUserDrafts === 'true' && session?.user) ? session.user.id : undefined,
      });
      exercises = result.exercises;
    } else {
      // Download filtered exercises
      const hasVideoFilter = tagsArray.includes('video');
      const actualTags = tagsArray.filter(tag => tag !== 'video');

      if (query || actualTags.length > 0 || hasVideoFilter) {
        const result = await searchExercisesWithAtlas(
          query as string,
          tagsArray,
          1,
          10000, // Large limit to get all results
          {
            status: finalStatus,
            userId: (includeUserDrafts === 'true' && session?.user) ? session.user.id : undefined,
            fuzzy: true,
          }
        );
        exercises = result.exercises;
      } else {
        const result = await getAllExercises(1, 10000, {
          status: finalStatus,
          userId: (includeUserDrafts === 'true' && session?.user) ? session.user.id : undefined,
          hasVideo: hasVideoFilter ? true : undefined,
        });
        exercises = result.exercises;
      }
    }

    // Create CSV content
    const csvHeader = [
      'Name',
      'Description',
      'Text',
      'Tags',
      'Difficulty',
      'Quality',
      'Confidence',
      'Author',
      'URL Slug',
      'Post URL',
      'Video URL',
      'Image URL',
      'Status',
      'Submitted By',
      'Approved By',
      'Created Date',
      'Updated Date'
    ].join(',');

    const csvRows = exercises.map(exerciseToCsvRow);
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Set headers for file download
    const filename = type === 'all' 
      ? `exicon-exercises-all-${new Date().toISOString().split('T')[0]}.csv`
      : `exicon-exercises-filtered-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('CSV Download Error:', error);
    return res.status(500).json({
      error: 'An error occurred while generating CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}