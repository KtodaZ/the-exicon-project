import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { createExercise } from '@/lib/api/exercise';
import { ExerciseStatus } from '@/lib/models/exercise';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session from headers
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0] : value);
      }
    });

    const session = await auth.api.getSession({ headers });

    if (!session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user can submit or create exercises
    const [canSubmit, canCreate] = await Promise.all([
      auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: { exercise: ["submit"] },
        },
      }),
      auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: { exercise: ["create"] },
        },
      }),
    ]);

    const hasSubmitPermission = canSubmit?.success && !canSubmit?.error;
    const hasCreatePermission = canCreate?.success && !canCreate?.error;

    if (!hasSubmitPermission && !hasCreatePermission) {
      return res.status(403).json({ error: 'Insufficient permissions to submit exercises' });
    }

    const { name, description, text, tags, difficulty, video_url, image_url, status: requestedStatus } = req.body;

    // Validate required fields
    if (!name || !description || !text) {
      return res.status(400).json({ error: 'Name, description, and text are required' });
    }

    // Determine status based on permissions and request
    let status: ExerciseStatus;
    
    if (hasCreatePermission) {
      // Users with create permission can set any status, default to draft if not specified
      status = (requestedStatus as ExerciseStatus) || 'draft';
      
      // Validate the requested status
      const validStatuses: ExerciseStatus[] = ['draft', 'submitted', 'active', 'archived'];
      if (requestedStatus && !validStatuses.includes(requestedStatus as ExerciseStatus)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
    } else if (hasSubmitPermission) {
      // Users with only submit permission can only create submitted exercises
      status = 'submitted';
    } else {
      return res.status(403).json({ error: 'Insufficient permissions to submit exercises' });
    }

    // Create the exercise
    const exerciseData = {
      name: name.trim(),
      description: description.trim(),
      text: text.trim(),
      tags: Array.isArray(tags) ? tags : [],
      difficulty: typeof difficulty === 'number' ? difficulty : 0.5,
      video_url: video_url?.trim() || '',
      image_url: image_url?.trim() || '',
      status,
      submittedBy: session.user.id,
      submittedAt: new Date(),
      ...(status === 'active' && {
        approvedBy: session.user.name || session.user.email,
        approvedAt: new Date(),
      }),
    };

    const exercise = await createExercise(exerciseData);

    res.status(201).json({
      success: true,
      exercise,
      message: status === 'active' 
        ? 'Exercise created and published successfully!' 
        : 'Exercise submitted for review successfully!',
    });

  } catch (error) {
    console.error('Error submitting exercise:', error);
    res.status(500).json({ 
      error: 'An error occurred while submitting the exercise',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 