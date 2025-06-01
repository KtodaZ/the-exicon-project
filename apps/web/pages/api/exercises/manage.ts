import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { ExerciseStatus } from '@/lib/models/exercise';
import { getDatabase } from '@/lib/mongodb';
import { invalidateExerciseCaches, invalidateCachesOnExerciseDelete } from '@/lib/cache-invalidation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get session from headers
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = await getDatabase();
    const exercisesCollection = db.collection('exercises');

    if (req.method === 'GET') {
      // List exercises with status filtering for admins/maintainers OR get single exercise
      const canViewAll = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            exercise: ["view-all"],
          },
        },
      });

      const canEdit = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            exercise: ["edit"],
          },
        },
      });

      if (!canViewAll?.success && !canEdit?.success) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { status, limit = 50, offset = 0, exerciseId, userOnly } = req.query;

      // If exerciseId is provided, return single exercise
      if (exerciseId) {
        console.log('Looking for exercise with ID:', exerciseId);
        console.log('ID type:', typeof exerciseId);

        const exercise = await exercisesCollection.findOne({
          _id: exerciseId as string
        });

        console.log('Exercise found:', exercise ? 'Yes' : 'No');
        if (exercise) {
          console.log('Exercise name:', exercise.name);
          console.log('Exercise status:', exercise.status);
        }

        if (!exercise) {
          return res.status(404).json({ error: 'Exercise not found' });
        }

        return res.status(200).json({
          success: true,
          exercise: {
            ...exercise,
            _id: exercise._id.toString(),
          },
        });
      }

      // Otherwise, return list of exercises
      let filter: any = {};
      if (status && status !== 'all') {
        filter.status = status;
      }

      // If userOnly is requested, filter by current user's submissions
      if (userOnly === 'true') {
        filter.submittedBy = session.user.id;
      }

      const exercises = await exercisesCollection
        .find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await exercisesCollection.countDocuments(filter);

      res.status(200).json({
        success: true,
        exercises: exercises.map(ex => ({
          ...ex,
          _id: ex._id.toString(),
        })),
        total,
        offset: parseInt(offset as string),
        limit: parseInt(limit as string),
      });

    } else if (req.method === 'PATCH') {
      // Update exercise status (approve, archive, etc.)
      const { exerciseId, status, ...updateData } = req.body;

      if (!exerciseId) {
        return res.status(400).json({ error: 'Exercise ID required' });
      }

      // Check permissions based on action
      const canApprove = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            exercise: ["approve"],
          },
        },
      });

      const canEdit = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            exercise: ["edit"],
          },
        },
      });

      if (!canApprove?.success && !canEdit?.success) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get the exercise
      const exercise = await exercisesCollection.findOne({
        _id: exerciseId
      });

      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Prepare update document
      let updateDoc: any = {
        updatedAt: new Date(),
        ...updateData,
      };

      // Handle status changes
      if (status) {
        updateDoc.status = status;

        // Add approval info when activating
        if (status === 'active' && exercise.status !== 'active') {
          updateDoc.approvedBy = session.user.id;
          updateDoc.approvedAt = new Date();
        }
      }

      // Update exercise
      const result = await exercisesCollection.updateOne(
        { _id: exerciseId },
        { $set: updateDoc }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Get updated exercise
      const updatedExercise = await exercisesCollection.findOne({
        _id: exerciseId
      });

      // Clear relevant caches to ensure fresh data is fetched
      if (updatedExercise) {
        await invalidateExerciseCaches(
          {
            _id: updatedExercise._id.toString(),
            urlSlug: updatedExercise.urlSlug,
            tags: updatedExercise.tags,
            name: updatedExercise.name
          },
          {
            tagsUpdated: !!updateData.tags,
            clearSimilarExercises: true,
            force: true
          }
        );
      }

      res.status(200).json({
        success: true,
        exercise: {
          ...updatedExercise,
          _id: updatedExercise!._id.toString(),
        },
        message: `Exercise ${status ? 'status updated' : 'updated'} successfully`,
      });

    } else if (req.method === 'DELETE') {
      // Delete exercise (only drafts by their creators)
      const { exerciseId } = req.body;

      if (!exerciseId) {
        return res.status(400).json({ error: 'Exercise ID required' });
      }

      // Get the exercise first
      const exercise = await exercisesCollection.findOne({
        _id: exerciseId
      });

      if (!exercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Check if user can delete this exercise
      const canDelete = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            exercise: ["delete"],
          },
        },
      });

      // Users can delete their own drafts, admins can delete any exercise
      const isOwnerDraft = exercise.submittedBy === session.user.id && exercise.status === 'draft';

      if (!canDelete?.success && !isOwnerDraft) {
        return res.status(403).json({ error: 'You can only delete your own draft exercises' });
      }

      // Delete the exercise
      const deleteResult = await exercisesCollection.deleteOne({
        _id: exerciseId
      });

      if (deleteResult.deletedCount === 0) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      // Invalidate caches for the deleted exercise
      await invalidateCachesOnExerciseDelete({
        _id: exercise._id.toString(),
        urlSlug: exercise.urlSlug,
        tags: exercise.tags,
        name: exercise.name
      });

      res.status(200).json({
        success: true,
        message: 'Exercise deleted successfully',
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in exercise management:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 