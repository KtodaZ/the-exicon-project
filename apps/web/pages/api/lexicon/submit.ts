import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { LexiconStatus } from '@/lib/api/lexicon';
import { getDatabase } from '@/lib/mongodb';
import { cache, cacheKeys } from '@/lib/redis';
import { slugify } from '@/lib/utils';

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

    // Check if user can submit or create lexicon items
    const [canSubmit, canCreate] = await Promise.all([
      auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: { lexicon: ["submit"] },
        },
      }),
      auth.api.userHasPermission({
        body: {
          userId: session.user.id,
          permissions: { lexicon: ["create"] },
        },
      }),
    ]);

    const hasSubmitPermission = canSubmit?.success && !canSubmit?.error;
    const hasCreatePermission = canCreate?.success && !canCreate?.error;

    if (!hasSubmitPermission && !hasCreatePermission) {
      return res.status(403).json({ error: 'Insufficient permissions to submit lexicon items' });
    }

    const { title, description, aliases, status: requestedStatus } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Determine status based on permissions and request
    let status: LexiconStatus;
    
    if (hasCreatePermission) {
      // Users with create permission can set any status, default to draft if not specified
      status = (requestedStatus as LexiconStatus) || 'draft';
      
      // Validate the requested status
      const validStatuses: LexiconStatus[] = ['draft', 'submitted', 'active', 'archived'];
      if (requestedStatus && !validStatuses.includes(requestedStatus as LexiconStatus)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
    } else if (hasSubmitPermission) {
      // Users with only submit permission can only create submitted lexicon items
      status = 'submitted';
    } else {
      return res.status(403).json({ error: 'Insufficient permissions to submit lexicon items' });
    }

    // Generate URL slug
    const urlSlug = slugify(title);

    // Check for duplicate slug
    const db = await getDatabase();
    const existingItem = await db.collection('lexicon').findOne({ urlSlug });
    
    if (existingItem) {
      return res.status(400).json({ error: 'A lexicon item with this title already exists' });
    }

    // Create the lexicon item
    const lexiconData = {
      title: title.trim(),
      description: description.trim(),
      aliases: Array.isArray(aliases) ? aliases : [],
      urlSlug,
      status,
      submittedBy: session.user.id,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(status === 'active' && {
        approvedBy: session.user.name || session.user.email,
        approvedAt: new Date(),
      }),
    };

    const result = await db.collection('lexicon').insertOne(lexiconData);

    // Invalidate relevant caches
    await Promise.all([
      cache.delete(cacheKeys.allExercises(1, 24).replace('exercises', 'lexicon')),
      cache.delete('lexicon_by_letter'),
    ]);

    // Return the created item with string ID
    const createdItem = {
      ...lexiconData,
      _id: result.insertedId.toString(),
    };

    res.status(201).json({
      success: true,
      lexicon: createdItem,
      message: status === 'active' 
        ? 'Lexicon item created and published successfully!' 
        : 'Lexicon item submitted for review successfully!',
    });

  } catch (error) {
    console.error('Error submitting lexicon item:', error);
    res.status(500).json({ 
      error: 'An error occurred while submitting the lexicon item',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}