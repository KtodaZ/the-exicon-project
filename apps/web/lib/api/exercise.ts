import clientPromise from '@/lib/mongodb';
import { Exercise, ExerciseListItem, ExerciseDetail } from '@/lib/models/exercise';
import { cache } from '@/lib/cache';
import { ObjectId } from 'mongodb';

// Utility function to safely convert string to ObjectId
function toObjectId(id: string | ObjectId): ObjectId {
  if (id instanceof ObjectId) return id;
  try {
    return new ObjectId(id);
  } catch (error) {
    console.error(`Invalid ObjectId: ${id}`, error);
    // Return a non-matching ObjectId to prevent errors
    return new ObjectId('000000000000000000000000');
  }
}

// Get all exercises with pagination
export async function getAllExercises(
  page: number = 1,
  limit: number = 12
): Promise<{ exercises: ExerciseListItem[]; totalCount: number }> {
  const cacheKey = `all-exercises-${page}-${limit}`;
  const cached = cache.get(cacheKey) as { exercises: ExerciseListItem[]; totalCount: number }
  
  if (cached && cached.exercises.length > 0) {
    console.log('getAllExercises cached', cached);
    return cached;
  }

  console.log('MongoDB connection starting...');
  const client = await clientPromise;
  const db = client.db();
  console.log('Connected to database:', db.databaseName);
  const collection = db.collection('exercises');
  console.log('Using collection:', collection.collectionName);
  
  const skip = (page - 1) * limit;
  console.log('Query params:', { skip, limit, page });
  
  try {
    // Check if the collection exists and has documents
    const collectionExists = await db.listCollections({ name: 'exercises' }).toArray();
    
    if (collectionExists.length === 0) {
      console.error('Collection "exercises" does not exist');
      return { exercises: [], totalCount: 0 };
    }
    
    // Count total documents for debugging
    const totalDocuments = await collection.countDocuments({});
    console.log('Total documents in collection:', totalDocuments);
    
    const [exercises, totalCount] = await Promise.all([
      collection
        .find({})
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .project<ExerciseListItem>({
          _id: 1,
          name: 1,
          description: 1,
          tags: 1,
          urlSlug: 1,
          difficulty: 1
        })
        .toArray(),
      collection.countDocuments({})
    ]);
    
    const result = { exercises, totalCount };
    cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error in getAllExercises:', error);
    throw error;
  }
}

// Get single exercise by slug
export async function getExerciseBySlug(slug: string): Promise<ExerciseDetail | null> {
  const cacheKey = `exercise-${slug}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached as ExerciseDetail;
  }

  console.log('getExerciseBySlug:', { slug });
  const client = await clientPromise;
  const db = client.db();
  
  try {
    const exercise = await db
      .collection('exercises')
      .findOne<Exercise>({ urlSlug: slug });

    console.log('Exercise lookup result:', exercise ? 'Found' : 'Not found');
    
    if (!exercise) {
      return null;
    }

    // Get similar exercises
    const similarExercises = await getSimilarExercises(exercise.tags, exercise._id);
    
    const result = {
      ...exercise,
      similarExercises
    };
    
    cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error in getExerciseBySlug:', error);
    throw error;
  }
}

// Get similar exercises based on tags
export async function getSimilarExercises(
  tags: string[],
  excludeId: string,
  limit: number = 6
): Promise<ExerciseListItem[]> {
  const cacheKey = `similar-${excludeId}-${tags.join('-')}-${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached as ExerciseListItem[];
  }

  const client = await clientPromise;
  const db = client.db();
  
  // First try to find exercises with exact same tags
  let similarExercises = await db
    .collection('exercises')
    .find<ExerciseListItem>({
      $and: [
        { _id: { $ne: new ObjectId(excludeId) } },
        { urlSlug: { $ne: excludeId } }, // Also filter by urlSlug to catch string IDs
        { tags: { $all: tags } }
      ]
    })
    .limit(limit)
    .project({
      _id: 1,
      name: 1,
      description: 1,
      tags: 1,
      urlSlug: 1,
      difficulty: 1
    })
    .toArray();

  // If we don't have enough matches, find exercises with at least one matching tag
  if (similarExercises.length < limit) {
    const remaining = limit - similarExercises.length;
    const existingIds = similarExercises.map(ex => ex._id);
    const objectIdExistingIds = existingIds.map(id => new ObjectId(id.toString()));
    
    const additionalExercises = await db
      .collection('exercises')
      .find<ExerciseListItem>({
        _id: { $ne: new ObjectId(excludeId), $nin: objectIdExistingIds },
        tags: { $in: tags }
      })
      .limit(remaining)
      .project({
        _id: 1,
        name: 1,
        description: 1,
        tags: 1,
        urlSlug: 1,
        difficulty: 1
      })
      .toArray();
    
    similarExercises = [...similarExercises, ...additionalExercises];
  }
  
  cache.set(cacheKey, similarExercises);
  
  return similarExercises as ExerciseListItem[];
}

// Search exercises by query and optional tags
export async function searchExercises(
  query: string,
  tags: string[] = [],
  page: number = 1,
  limit: number = 12
): Promise<{ exercises: ExerciseListItem[]; totalCount: number }> {
  const cacheKey = `search-${query}-${tags.join('-')}-${page}-${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    console.log('searchExercises using cached result:', cached);
    return cached as { exercises: ExerciseListItem[]; totalCount: number };
  }

  console.log('searchExercises MongoDB connection starting...');
  const client = await clientPromise;
  const db = client.db();
  console.log('searchExercises connected to database:', db.databaseName);
  
  const skip = (page - 1) * limit;
  console.log('searchExercises query params:', { query, tags, skip, limit, page });
  
  const filter: any = {};
  
  // Add text search if query provided
  if (query && query.trim() !== '') {
    filter.$text = { $search: query };
    console.log('Adding text search filter for query:', query);
  }
  
  // Add tag filter if tags provided
  if (tags && tags.length > 0) {
    filter.tags = { $all: tags };
    console.log('Adding tags filter:', tags);
  }
  
  console.log('Final filter:', filter);
  
  try {
    // Check if the collection exists and has documents
    const collectionExists = await db.listCollections({ name: 'exercises' }).toArray();
    console.log('Collection exists check:', collectionExists);
    
    if (collectionExists.length === 0) {
      console.error('Collection "exercises" does not exist');
      return { exercises: [], totalCount: 0 };
    }
    
    // Check if text index exists
    if (query && query.trim() !== '') {
      const indexes = await db.collection('exercises').indexes();
      console.log('Available indexes:', indexes);
      const textIndexExists = indexes.some(index => index.key && index.key._fts === 'text');
      if (!textIndexExists) {
        console.warn('No text index found on exercises collection!');
      }
    }
    
    const [exercises, totalCount] = await Promise.all([
      db
        .collection('exercises')
        .find(filter)
        .sort(query ? { score: { $meta: 'textScore' } } : { name: 1 })
        .skip(skip)
        .limit(limit)
        .project<ExerciseListItem>({
          _id: 1,
          name: 1,
          description: 1,
          tags: 1,
          urlSlug: 1,
          difficulty: 1,
          ...(query ? { score: { $meta: 'textScore' } } : {})
        })
        .toArray(),
      db.collection('exercises').countDocuments(filter)
    ]);
    
    console.log('searchExercises results:', { 
      exercisesCount: exercises.length, 
      totalCount,
      firstExercise: exercises.length > 0 ? exercises[0] : null
    });
    
    const result = { exercises, totalCount };
    cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error in searchExercises:', error);
    throw error;
  }
}

// Get popular tags
export async function getPopularTags(limit: number = 10): Promise<{ tag: string; count: number }[]> {
  const cacheKey = `popular-tags-${limit}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached as { tag: string; count: number }[];
  }

  const client = await clientPromise;
  const db = client.db();
  
  const pipeline = [
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { tag: '$_id', count: 1, _id: 0 } }
  ];
  
  const result = await db
    .collection('exercises')
    .aggregate(pipeline)
    .toArray() as { tag: string; count: number }[];
  
  cache.set(cacheKey, result);
  
  return result;
}

// Add diagnostic function
export async function checkExerciseCollection(): Promise<{ exists: boolean; count: number; sample?: any }> {
  try {
    console.log('Diagnosing exercise collection...');
    const client = await clientPromise;
    const db = client.db();
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'exercises' }).toArray();
    const exists = collections.length > 0;
    console.log('Exercise collection exists:', exists);
    
    if (!exists) {
      return { exists: false, count: 0 };
    }
    
    // Check document count
    const collection = db.collection('exercises');
    const count = await collection.countDocuments({});
    console.log('Exercise collection document count:', count);
    
    // Get a sample document
    let sample = null;
    if (count > 0) {
      sample = await collection.findOne({});
      console.log('Sample document:', JSON.stringify(sample, null, 2));
    }
    
    // Check indexes
    const indexes = await collection.indexes();
    console.log('Collection indexes:', indexes);
    
    return { exists, count, sample };
  } catch (error) {
    console.error('Error checking exercise collection:', error);
    throw error;
  }
}