import { getDatabase } from '@/lib/mongodb';
import { Exercise, ExerciseListItem, ExerciseDetail } from '@/lib/models/exercise';
import { cache, cacheKeys, cacheTTL } from '@/lib/redis';
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
  const cacheKey = cacheKeys.allExercises(page, limit);
  const cached = await cache.get<{ exercises: ExerciseListItem[]; totalCount: number }>(cacheKey);
  
  if (cached && cached.exercises.length > 0) {
    console.log('getAllExercises using cached result with', cached.exercises.length, 'exercises');
    return cached;
  }

  console.log('MongoDB connection starting for getAllExercises...');
  const db = await getDatabase();
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
    await cache.set(cacheKey, result, cacheTTL.allExercises);
    
    return result;
  } catch (error) {
    console.error('Error in getAllExercises:', error);
    throw error;
  }
}

// Get single exercise by slug
export async function getExerciseBySlug(slug: string): Promise<ExerciseDetail | null> {
  const cacheKey = cacheKeys.exerciseBySlug(slug);
  const cached = await cache.get<ExerciseDetail>(cacheKey);
  
  if (cached) {
    return cached;
  }

  console.log('getExerciseBySlug:', { slug });
  const db = await getDatabase();
  
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

    // Get similar exercises - pass string ID directly
    const similarExercises = await getSimilarExercises(exercise.tags, exercise._id);
    
    const result = {
      ...exercise,
      similarExercises
    };
    
    await cache.set(cacheKey, result, cacheTTL.exerciseDetail);
    
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
  limit: number = 8
): Promise<ExerciseListItem[]> {
  const cacheKey = cacheKeys.similarExercises(excludeId, tags, limit);
  const cached = await cache.get<ExerciseListItem[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const db = await getDatabase();
  
  console.log('Finding similar exercises for tags:', tags, 'excluding ID:', excludeId);
  console.log('Exclude ID type:', typeof excludeId);
  
  // Use aggregation pipeline to score exercises by tag similarity
  const pipeline = [
    {
      // Exclude the current exercise (using string ID directly)
      $match: {
        _id: { $ne: excludeId }
      }
    },
    {
      // Add a field that calculates the number of matching tags
      $addFields: {
        matchingTagsCount: {
          $size: {
            $setIntersection: ['$tags', tags]
          }
        },
        // Calculate similarity score (percentage of tags that match)
        similarityScore: {
          $divide: [
            { $size: { $setIntersection: ['$tags', tags] } },
            tags.length
          ]
        }
      }
    },
    {
      // Only include exercises that have at least one matching tag
      $match: {
        matchingTagsCount: { $gt: 0 }
      }
    },
    {
      // Sort by number of matching tags (descending), then by similarity score, then by publish date
      $sort: {
        matchingTagsCount: -1,
        similarityScore: -1,
        publishedAt: -1
      }
    },
    {
      // Limit results
      $limit: limit
    },
    {
      // Project only the fields we need
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        tags: 1,
        urlSlug: 1,
        difficulty: 1,
        video_url: 1,
        image_url: 1,
        matchingTagsCount: 1,
        similarityScore: 1
      }
    }
  ];
  
  const similarExercises = await db
    .collection('exercises')
    .aggregate(pipeline)
    .toArray() as (ExerciseListItem & { matchingTagsCount: number; similarityScore: number })[];
  
  console.log(`Found ${similarExercises.length} similar exercises with tag scoring:`);
  similarExercises.forEach((exercise, index) => {
    console.log(`  ${index + 1}. ${exercise.name} - ${exercise.matchingTagsCount}/${tags.length} tags (${Math.round(exercise.similarityScore * 100)}% similarity) - ID: ${exercise._id}`);
  });
  
  // Check if the current exercise is in the results (it shouldn't be)
  const currentExerciseInResults = similarExercises.find(ex => ex._id === excludeId);
  if (currentExerciseInResults) {
    console.warn('WARNING: Current exercise found in similar results!', currentExerciseInResults.name);
  } else {
    console.log('✓ Current exercise successfully excluded from results');
  }
  
  // Remove the scoring fields before returning
  const cleanedExercises = similarExercises.map(({ matchingTagsCount, similarityScore, ...exercise }) => exercise);
  
  await cache.set(cacheKey, cleanedExercises, cacheTTL.similarExercises);
  
  return cleanedExercises as ExerciseListItem[];
}

// Search exercises by query and optional tags
export async function searchExercises(
  query: string,
  tags: string[] = [],
  page: number = 1,
  limit: number = 12
): Promise<{ exercises: ExerciseListItem[]; totalCount: number }> {
  const cacheKey = cacheKeys.searchExercises(query, tags, page, limit);
  const cached = await cache.get<{ exercises: ExerciseListItem[]; totalCount: number }>(cacheKey);
  
  if (cached) {
    console.log('searchExercises using cached result with', 
      cached.exercises?.length || 0, 'exercises');
    return cached;
  }

  console.log('searchExercises MongoDB connection starting...');
  const db = await getDatabase();
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
    await cache.set(cacheKey, result, cacheTTL.searchResults);
    
    return result;
  } catch (error) {
    console.error('Error in searchExercises:', error);
    throw error;
  }
}

// Get popular tags
export async function getPopularTags(limit: number = 10): Promise<{ tag: string; count: number }[]> {
  const cacheKey = cacheKeys.popularTags();
  const cached = await cache.get<{ tag: string; count: number }[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const db = await getDatabase();
  
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
  
  await cache.set(cacheKey, result, cacheTTL.popularTags);
  
  return result;
}

// Add diagnostic function
export async function checkExerciseCollection(): Promise<{ exists: boolean; count: number; sample?: any }> {
  try {
    const db = await getDatabase();
    
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