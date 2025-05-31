import { getDatabase } from '@/lib/mongodb';
import { cache, cacheKeys, cacheTTL } from '@/lib/redis';

// Lexicon item interfaces
export type LexiconStatus = 'draft' | 'submitted' | 'active' | 'archived';

export interface LexiconItem {
  _id: string;
  title: string;
  description: string;
  urlSlug: string;
  rawHTML: string;
  createdAt: Date;
  updatedAt: Date;
  status: LexiconStatus;
  submittedBy?: string;
  submittedAt?: Date | string;
  approvedBy?: string;
  approvedAt?: Date | string;
}

export interface LexiconListItem {
  _id: string;
  title: string;
  description: string;
  urlSlug: string;
  status: LexiconStatus;
  submittedBy?: string;
  submittedAt?: Date | string;
}

// Get all lexicon items with pagination
export async function getAllLexiconItems(
  page: number = 1,
  limit: number = 24
): Promise<{ items: LexiconListItem[]; totalCount: number }> {
  const cacheKey = cacheKeys.allExercises(page, limit).replace('exercises', 'lexicon'); // Reuse cache pattern
  console.log(`🔍 getAllLexiconItems called - page: ${page}, limit: ${limit}`);

  const cached = await cache.get<{ items: LexiconListItem[]; totalCount: number }>(cacheKey);

  if (cached) {
    console.log(`✅ getAllLexiconItems using cached result with ${cached.items.length} items`);
    return cached;
  }

  console.log('📊 getAllLexiconItems cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  const collection = db.collection('lexicon');

  const skip = (page - 1) * limit;

  try {
    // Check if the collection exists and has documents
    const collectionExists = await db.listCollections({ name: 'lexicon' }).toArray();
    console.log('Lexicon collection exists check:', collectionExists.length > 0);

    if (collectionExists.length === 0) {
      console.error('Collection "lexicon" does not exist');
      return { items: [], totalCount: 0 };
    }

    // Count total documents
    const totalDocuments = await collection.countDocuments({});
    console.log('Total lexicon documents:', totalDocuments);

    if (totalDocuments === 0) {
      console.warn('No lexicon items found');
      return { items: [], totalCount: 0 };
    }

    console.log('Running lexicon query with pagination...');
    const items = await collection
      .find({})
      .sort({ title: 1 }) // Sort alphabetically by title
      .skip(skip)
      .limit(limit)
      .project<LexiconListItem>({
        _id: 1,
        title: 1,
        description: 1,
        urlSlug: 1,
      })
      .toArray();

    console.log('Found', items.length, 'lexicon items');

    const result = { items, totalCount: totalDocuments };
    console.log(`💾 Caching getAllLexiconItems result (${items.length} items, ${totalDocuments} total)`);
    await cache.set(cacheKey, result, cacheTTL.allExercises); // Reuse cache TTL

    return result;
  } catch (error) {
    console.error('Error in getAllLexiconItems:', error);
    throw error;
  }
}

// Search lexicon items
export async function searchLexiconItems(
  query: string,
  page: number = 1,
  limit: number = 24
): Promise<{ items: LexiconListItem[]; totalCount: number }> {
  const cacheKey = `lexicon_search_${query}_${page}_${limit}`;
  console.log(`🔍 searchLexiconItems called - query: "${query}", page: ${page}, limit: ${limit}`);

  const cached = await cache.get<{ items: LexiconListItem[]; totalCount: number }>(cacheKey);

  if (cached) {
    console.log(`✅ searchLexiconItems using cached result with ${cached.items.length} items`);
    return cached;
  }

  console.log('📊 searchLexiconItems cache miss - searching MongoDB...');
  const db = await getDatabase();
  const collection = db.collection('lexicon');

  const skip = (page - 1) * limit;

  try {
    // Build search filter using regex only (more reliable than mixing text search with regex)
    const searchFilter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    // Count total matching documents
    const totalDocuments = await collection.countDocuments(searchFilter);
    console.log('Total matching lexicon documents:', totalDocuments);

    if (totalDocuments === 0) {
      console.warn('No lexicon items found matching query');
      return { items: [], totalCount: 0 };
    }

    console.log('Running lexicon search query with pagination...');
    const items = await collection
      .find(searchFilter)
      .sort({ title: 1 }) // Sort alphabetically by title
      .skip(skip)
      .limit(limit)
      .project<LexiconListItem>({
        _id: 1,
        title: 1,
        description: 1,
        urlSlug: 1,
      })
      .toArray();

    console.log('Found', items.length, 'matching lexicon items');

    const result = { items, totalCount: totalDocuments };
    console.log(`💾 Caching searchLexiconItems result`);
    await cache.set(cacheKey, result, cacheTTL.allExercises); // Short cache for search results

    return result;
  } catch (error) {
    console.error('Error in searchLexiconItems:', error);
    throw error;
  }
}

// Get single lexicon item by slug
export async function getLexiconItemBySlug(slug: string): Promise<LexiconItem | null> {
  const cacheKey = `lexicon_slug_${slug}`;
  console.log(`🔍 getLexiconItemBySlug called - slug: ${slug}`);

  const cached = await cache.get<LexiconItem>(cacheKey);

  if (cached) {
    console.log(`✅ getLexiconItemBySlug using cached result for slug: ${slug}`);
    return cached;
  }

  console.log(`📊 getLexiconItemBySlug cache miss - fetching from MongoDB for slug: ${slug}`);
  const db = await getDatabase();

  try {
    const item = await db
      .collection('lexicon')
      .findOne<LexiconItem>({ urlSlug: slug });

    console.log('Lexicon lookup result:', item ? `Found: ${item.title}` : 'Not found');

    if (!item) {
      console.log(`❌ Lexicon item not found for slug: ${slug}`);
      return null;
    }

    console.log(`💾 Caching getLexiconItemBySlug result`);
    await cache.set(cacheKey, item, cacheTTL.allExercises);

    return item;
  } catch (error) {
    console.error('Error in getLexiconItemBySlug:', error);
    throw error;
  }
}

// Get lexicon items grouped by first letter
export async function getLexiconItemsByLetter(): Promise<{ [letter: string]: LexiconListItem[] }> {
  const cacheKey = 'lexicon_by_letter';
  console.log('🔍 getLexiconItemsByLetter called');

  const cached = await cache.get<{ [letter: string]: LexiconListItem[] }>(cacheKey);

  if (cached) {
    console.log('✅ getLexiconItemsByLetter using cached result');
    return cached;
  }

  console.log('📊 getLexiconItemsByLetter cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  const collection = db.collection('lexicon');

  try {
    const items = await collection
      .find({})
      .sort({ title: 1 })
      .project<LexiconListItem>({
        _id: 1,
        title: 1,
        description: 1,
        urlSlug: 1,
      })
      .toArray();

    // Group by first letter
    const groupedItems: { [letter: string]: LexiconListItem[] } = {};
    
    items.forEach(item => {
      const firstLetter = item.title.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      
      if (!groupedItems[letter]) {
        groupedItems[letter] = [];
      }
      groupedItems[letter].push(item);
    });

    console.log(`💾 Caching getLexiconItemsByLetter result (${Object.keys(groupedItems).length} letters)`);
    await cache.set(cacheKey, groupedItems, cacheTTL.allExercises);

    return groupedItems;
  } catch (error) {
    console.error('Error in getLexiconItemsByLetter:', error);
    throw error;
  }
} 