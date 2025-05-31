import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { LexiconStatus } from '@/lib/api/lexicon';
import { getDatabase } from '@/lib/mongodb';
import { cache, cacheKeys } from '@/lib/redis';
import { slugify } from '@/lib/utils';
import { ObjectId } from 'mongodb';

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
    const lexiconCollection = db.collection('lexicon');

    if (req.method === 'GET') {
      // List lexicon items with status filtering for admins/maintainers OR get single lexicon item
      const canViewAll = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            lexicon: ["view-all"],
          },
        },
      });

      const canEdit = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            lexicon: ["edit"],
          },
        },
      });

      if (!canViewAll?.success && !canEdit?.success) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { status, limit = 50, offset = 0, lexiconId, userOnly } = req.query;

      // If lexiconId is provided, return single lexicon item
      if (lexiconId) {
        console.log('Looking for lexicon item with ID:', lexiconId);
        console.log('ID type:', typeof lexiconId);

        // Validate ObjectId format
        if (!ObjectId.isValid(lexiconId as string)) {
          return res.status(400).json({ error: 'Invalid lexicon item ID format' });
        }

        const lexiconItem = await lexiconCollection.findOne({
          _id: new ObjectId(lexiconId as string)
        });

        console.log('Lexicon item found:', lexiconItem ? 'Yes' : 'No');
        if (lexiconItem) {
          console.log('Lexicon title:', lexiconItem.title);
          console.log('Lexicon status:', lexiconItem.status);
        }

        if (!lexiconItem) {
          return res.status(404).json({ error: 'Lexicon item not found' });
        }

        return res.status(200).json({
          success: true,
          lexicon: {
            ...lexiconItem,
            _id: lexiconItem._id.toString(),
          },
        });
      }

      // Otherwise, return list of lexicon items
      let filter: any = {};
      if (status && status !== 'all') {
        filter.status = status;
      }

      // If userOnly is requested, filter by current user's submissions
      if (userOnly === 'true') {
        filter.submittedBy = session.user.id;
      }

      const lexiconItems = await lexiconCollection
        .find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .toArray();

      const total = await lexiconCollection.countDocuments(filter);

      res.status(200).json({
        success: true,
        lexicon: lexiconItems.map(item => ({
          ...item,
          _id: item._id.toString(),
        })),
        total,
        offset: parseInt(offset as string),
        limit: parseInt(limit as string),
      });

    } else if (req.method === 'PATCH') {
      // Update lexicon item status (approve, archive, etc.)
      const { lexiconId, status, aliases, ...updateData } = req.body;

      if (!lexiconId) {
        return res.status(400).json({ error: 'Lexicon item ID required' });
      }

      // Validate ObjectId format
      if (!ObjectId.isValid(lexiconId)) {
        return res.status(400).json({ error: 'Invalid lexicon item ID format' });
      }

      // Check permissions based on action
      const canApprove = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            lexicon: ["approve"],
          },
        },
      });

      const canEdit = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            lexicon: ["edit"],
          },
        },
      });

      if (!canApprove?.success && !canEdit?.success) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Get the lexicon item
      const lexiconItem = await lexiconCollection.findOne({
        _id: new ObjectId(lexiconId)
      });

      if (!lexiconItem) {
        return res.status(404).json({ error: 'Lexicon item not found' });
      }

      // Prepare update document
      let updateDoc: any = {
        updatedAt: new Date(),
        ...updateData,
      };

      // Handle aliases if provided
      if (aliases !== undefined) {
        updateDoc.aliases = Array.isArray(aliases) ? aliases : [];
      }

      // Handle URL slug updates if title changed
      if (updateData.title && updateData.title !== lexiconItem.title) {
        const newSlug = slugify(updateData.title);
        
        // Check for slug conflicts
        const existingItem = await lexiconCollection.findOne({ 
          urlSlug: newSlug,
          _id: { $ne: new ObjectId(lexiconId) }
        });
        
        if (existingItem) {
          return res.status(400).json({ error: 'A lexicon item with this title already exists' });
        }
        
        updateDoc.urlSlug = newSlug;
      }

      // Handle status changes
      if (status) {
        updateDoc.status = status;

        // Add approval info when activating
        if (status === 'active' && lexiconItem.status !== 'active') {
          updateDoc.approvedBy = session.user.id;
          updateDoc.approvedAt = new Date();
        }
      }

      // Update lexicon item
      const result = await lexiconCollection.updateOne(
        { _id: new ObjectId(lexiconId) },
        { $set: updateDoc }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Lexicon item not found' });
      }

      // Get updated lexicon item
      const updatedLexiconItem = await lexiconCollection.findOne({
        _id: new ObjectId(lexiconId)
      });

      // Clear relevant caches to ensure fresh data is fetched
      if (updatedLexiconItem) {
        await Promise.all([
          cache.delete(cacheKeys.allExercises(1, 24).replace('exercises', 'lexicon')),
          cache.delete('lexicon_by_letter'),
          cache.delete(`lexicon_slug_${lexiconItem.urlSlug}`),
          updateDoc.urlSlug && cache.delete(`lexicon_slug_${updateDoc.urlSlug}`),
        ].filter(Boolean));
      }

      res.status(200).json({
        success: true,
        lexicon: {
          ...updatedLexiconItem,
          _id: updatedLexiconItem!._id.toString(),
        },
        message: `Lexicon item ${status ? 'status updated' : 'updated'} successfully`,
      });

    } else if (req.method === 'DELETE') {
      // Delete lexicon item (only drafts by their creators)
      const { lexiconId } = req.body;

      if (!lexiconId) {
        return res.status(400).json({ error: 'Lexicon item ID required' });
      }

      // Validate ObjectId format
      if (!ObjectId.isValid(lexiconId)) {
        return res.status(400).json({ error: 'Invalid lexicon item ID format' });
      }

      // Get the lexicon item first
      const lexiconItem = await lexiconCollection.findOne({
        _id: new ObjectId(lexiconId)
      });

      if (!lexiconItem) {
        return res.status(404).json({ error: 'Lexicon item not found' });
      }

      // Check if user can delete this lexicon item
      const canDelete = await auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: {
            lexicon: ["delete"],
          },
        },
      });

      // Users can delete their own drafts, admins can delete any lexicon item
      const isOwnerDraft = lexiconItem.submittedBy === session.user.id && lexiconItem.status === 'draft';

      if (!canDelete?.success && !isOwnerDraft) {
        return res.status(403).json({ error: 'You can only delete your own draft lexicon items' });
      }

      // Delete the lexicon item
      const deleteResult = await lexiconCollection.deleteOne({
        _id: new ObjectId(lexiconId)
      });

      if (deleteResult.deletedCount === 0) {
        return res.status(404).json({ error: 'Lexicon item not found' });
      }

      // Invalidate caches for the deleted lexicon item
      await Promise.all([
        cache.delete(cacheKeys.allExercises(1, 24).replace('exercises', 'lexicon')),
        cache.delete('lexicon_by_letter'),
        cache.delete(`lexicon_slug_${lexiconItem.urlSlug}`),
      ]);

      res.status(200).json({
        success: true,
        message: 'Lexicon item deleted successfully',
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in lexicon management:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}