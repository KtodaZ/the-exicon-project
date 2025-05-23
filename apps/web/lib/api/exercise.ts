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
    console.log('getAllExercises using cached result with', cached.exercises.length, 'exercises');
    return cached;
  }

  console.log('MongoDB connection starting for getAllExercises...');
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
    console.log('Collection exists check:', collectionExists.length > 0);
    
    if (collectionExists.length === 0) {
      console.error('Collection "exercises" does not exist');
      return { exercises: [], totalCount: 0 };
    }
    
    // Count total documents for debugging
    const totalDocuments = await collection.countDocuments({});
    console.log('Total documents in collection:', totalDocuments);
    
    if (totalDocuments === 0) {
      console.warn('Exercise collection exists but is empty');
      return { exercises: [], totalCount: 0 };
    }
    
    // Get sample document to check structure
    const sampleDoc = await collection.findOne({});
    console.log('Sample document ID type:', typeof sampleDoc?._id, 'Value:', sampleDoc?._id);
    
    console.log('Running exercises query with pagination...');
    const exercises = await collection
      .find({})
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .project<ExerciseListItem>({
        _id: 1,
        name: 1,
        description: 1,
        tags: 1,
        urlSlug: 1,
        difficulty: 1,
        video_url: 1,
        image_url: 1
      })
      .toArray();
      
    console.log('Found', exercises.length, 'exercises');
    if (exercises.length > 0) {
      console.log('First result ID type:', typeof exercises[0]._id);
      console.log('First result:', {
        _id: exercises[0]._id,
        name: exercises[0].name,
        urlSlug: exercises[0].urlSlug
      });
    }
    
    const totalCount = await collection.countDocuments({});
    
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

    // Process video URL for better browser compatibility
    if (exercise.video_url) {
      exercise.video_url = processVideoUrl(exercise.video_url);
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

/**
 * Processes a video URL to ensure better browser compatibility
 * This can be extended to handle video format conversion if needed
 */
function processVideoUrl(url: string): string {
  // For now, we're just ensuring the URL is properly formatted
  // This is where server-side conversion could be implemented in the future
  
  // If URL ends with .mov but the content is compatible with MP4 format
  // This doesn't actually convert the video, but many .mov files are actually 
  // using H.264 codec which is MP4 compatible
  if (url.toLowerCase().endsWith('.mov')) {
    console.log('MOV video format detected, ensuring compatibility');
    // In the future, this is where a conversion service would be implemented
  }
  
  return url;
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
  
  console.log('Finding similar exercises for tags:', tags, 'excluding ID:', excludeId);
  
  // First try to find exercises with exact same tags
  let similarExercises = await db
    .collection('exercises')
    .find<ExerciseListItem>({
      // Use type assertion to fix TypeScript error
      _id: { $ne: excludeId } as any,
      tags: { $all: tags }
    })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .project({
      _id: 1,
      name: 1,
      description: 1,
      tags: 1,
      urlSlug: 1,
      difficulty: 1,
      video_url: 1,
      image_url: 1
    })
    .toArray();

  console.log(`Found ${similarExercises.length} exercises with exact tag match`);
  
  // If we don't have enough matches, find exercises with at least one matching tag
  if (similarExercises.length < limit) {
    const remaining = limit - similarExercises.length;
    const existingIds = similarExercises.map(ex => ex._id);
    
    const additionalExercises = await db
      .collection('exercises')
      .find<ExerciseListItem>({
        // Use type assertion to fix TypeScript error
        _id: { $ne: excludeId, $nin: existingIds } as any,
        tags: { $in: tags }
      })
      .sort({ publishedAt: -1 })
      .limit(remaining)
      .project({
        _id: 1,
        name: 1,
        description: 1,
        tags: 1,
        urlSlug: 1,
        difficulty: 1,
        video_url: 1,
        image_url: 1
      })
      .toArray();
    
    console.log(`Found ${additionalExercises.length} additional exercises with partial tag match`);
    
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
    console.log('searchExercises using cached result with', 
      (cached as any).exercises?.length || 0, 'exercises');
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
  
  console.log('Final filter:', JSON.stringify(filter, null, 2));
  
  try {
    // Check if the collection exists and has documents
    const collectionExists = await db.listCollections({ name: 'exercises' }).toArray();
    
    if (collectionExists.length === 0) {
      console.error('Collection "exercises" does not exist');
      return { exercises: [], totalCount: 0 };
    }
    
    // Check total documents in collection
    const totalDocuments = await db.collection('exercises').countDocuments({});
    console.log('Total documents in collection:', totalDocuments);
    
    if (totalDocuments === 0) {
      console.warn('Exercise collection exists but is empty');
      return { exercises: [], totalCount: 0 };
    }
    
    // Check if text index exists if using text search
    if (query && query.trim() !== '') {
      const indexes = await db.collection('exercises').indexes();
      console.log('Available indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));
      
      const textIndexExists = indexes.some(index => 
        index.key && (
          index.key._fts === 'text' || 
          Object.values(index.key).includes('text') ||
          index.name?.includes('text')
        )
      );
      
      console.log('Text index exists:', textIndexExists);
      
      if (!textIndexExists) {
        console.warn('No text index found on exercises collection! Text search will not work properly.');
        console.log('Creating a basic filter instead of text search');
        // Fall back to basic search if no text index
        delete filter.$text;
        filter.$or = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ];
      }
    }
    
    console.log('Executing search query...');
    const exercises = await db
      .collection('exercises')
      .find(filter)
      .sort(query && filter.$text ? { score: { $meta: 'textScore' } } : { publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .project<ExerciseListItem>({
        _id: 1,
        name: 1,
        description: 1,
        tags: 1,
        urlSlug: 1,
        difficulty: 1,
        video_url: 1,
        image_url: 1,
        ...(query && filter.$text ? { score: { $meta: 'textScore' } } : {})
      })
      .toArray();
    
    const totalCount = await db.collection('exercises').countDocuments(filter);
    
    console.log('searchExercises results:', { 
      exercisesCount: exercises.length, 
      totalCount,
      firstExercise: exercises.length > 0 ? {
        _id: exercises[0]._id,
        name: exercises[0].name,
        urlSlug: exercises[0].urlSlug
      } : null
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
    const client = await clientPromise;
    const db = client.db();
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'exercises' }).toArray();
    const exists = collections.length > 0;
    
    if (!exists) {
      return { exists: false, count: 0 };
    }
    
    // Check document count
    const collection = db.collection('exercises');
    const count = await collection.countDocuments({});
    
    // Get a sample document
    let sample = null;
    if (count > 0) {
      sample = await collection.findOne({});
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