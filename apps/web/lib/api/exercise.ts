import { getDatabase } from '@/lib/mongodb';
import { Exercise, ExerciseListItem, ExerciseDetail, ExerciseStatus } from '@/lib/models/exercise';
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
  limit: number = 12,
  options?: {
    status?: string;
    userId?: string;
  }
): Promise<{ exercises: ExerciseListItem[]; totalCount: number }> {
  const { status = 'active', userId } = options || {};
  const cacheKey = cacheKeys.allExercises(page, limit) + `_${status}_${userId || 'public'}`;
  console.log(`🔍 getAllExercises called - page: ${page}, limit: ${limit}, status: ${status}, userId: ${userId}`);
  
  const cached = await cache.get<{ exercises: ExerciseListItem[]; totalCount: number }>(cacheKey);
  
  if (cached && cached.exercises.length > 0) {
    console.log(`✅ getAllExercises using cached result with ${cached.exercises.length} exercises (total: ${cached.totalCount})`);
    return cached;
  }

  console.log('📊 getAllExercises cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  console.log('Connected to database:', db.databaseName);
  const collection = db.collection('exercises');
  console.log('Using collection:', collection.collectionName);
  
  const skip = (page - 1) * limit;
  console.log('Query params:', { skip, limit, page, status, userId });
  
  try {
    // Check if the collection exists and has documents
    const collectionExists = await db.listCollections({ name: 'exercises' }).toArray();
    console.log('Collection exists check:', collectionExists.length > 0);
    
    if (collectionExists.length === 0) {
      console.error('Collection "exercises" does not exist');
      return { exercises: [], totalCount: 0 };
    }
    
    // Build query filter based on status and user access
    let filter: any = {};
    
    if (status === 'draft' && userId) {
      // User can only see their own drafts
      filter = { status: 'draft', submittedBy: userId };
    } else if (status === 'active') {
      // Everyone can see active exercises
      filter = { status: 'active' };
    } else if (status && ['submitted', 'archived'].includes(status)) {
      // Only specific statuses (admin/maintainer access)
      filter = { status };
    } else {
      // Default fallback to active
      filter = { status: 'active' };
    }
    
    console.log('Using filter:', filter);
    
    // Count total documents for debugging
    const totalDocuments = await collection.countDocuments(filter);
    console.log('Total matching documents:', totalDocuments);
    
    if (totalDocuments === 0) {
      console.warn('No exercises found matching filter');
      return { exercises: [], totalCount: 0 };
    }
    
    console.log('Running exercises query with pagination...');
    const exercises = await collection
      .find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
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
        status: 1,
        submittedBy: 1,
        submittedAt: 1,
      })
      .toArray();
      
    console.log('Found', exercises.length, 'exercises');
    if (exercises.length > 0) {
      console.log('First result ID type:', typeof exercises[0]._id);
      console.log('First result:', {
        _id: exercises[0]._id,
        name: exercises[0].name,
        urlSlug: exercises[0].urlSlug,
        status: exercises[0].status,
      });
    }
    
    const totalCount = await collection.countDocuments(filter);
    
    const result = { exercises, totalCount };
    console.log(`💾 Caching getAllExercises result (${exercises.length} exercises, ${totalCount} total)`);
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
  console.log(`🔍 getExerciseBySlug called - slug: ${slug}`);
  
  const cached = await cache.get<ExerciseDetail>(cacheKey);
  
  if (cached) {
    console.log(`✅ getExerciseBySlug using cached result for slug: ${slug}`);
    return cached;
  }

  console.log(`📊 getExerciseBySlug cache miss - fetching from MongoDB for slug: ${slug}`);
  const db = await getDatabase();
  
  try {
    const exercise = await db
      .collection('exercises')
      .findOne<Exercise>({ urlSlug: slug });

    console.log('Exercise lookup result:', exercise ? `Found: ${exercise.name}` : 'Not found');
    
    if (!exercise) {
      console.log(`❌ Exercise not found for slug: ${slug}`);
      return null;
    }

    // Process video URL for better browser compatibility
    if (exercise.video_url) {
      exercise.video_url = processVideoUrl(exercise.video_url);
    }

    // Get similar exercises - pass string ID directly
    console.log(`🔗 Fetching similar exercises for: ${exercise.name} (tags: ${exercise.tags.join(', ')})`);
    const similarExercises = await getSimilarExercises(exercise.tags, exercise._id);
    
    // Look up author information if submittedBy exists
    let authorName = undefined;
    if (exercise.submittedBy) {
      try {
        console.log(`👤 Looking up user information for: ${exercise.submittedBy}`);
        const user = await db
          .collection('user')
          .findOne({ _id: toObjectId(exercise.submittedBy) });
        
        console.log(`👤 User lookup result:`, user ? {
          id: user._id,
          name: user.name,
          f3Name: user.f3Name,
          f3Region: user.f3Region,
          email: user.email,
        } : 'User not found');
        
        if (user && user.f3Name) {
          authorName = user.f3Region 
            ? `${user.f3Name} (${user.f3Region})`
            : user.f3Name;
          console.log(`✅ Author found with F3 info: ${authorName}`);
        } else if (user && user.name) {
          authorName = user.name;
          console.log(`✅ Author fallback to name: ${authorName}`);
        } else {
          console.log(`❌ User not found or missing info for: ${exercise.submittedBy}`);
        }
      } catch (error) {
        console.error('Error looking up author information:', error);
      }
    } else {
      console.log(`👤 No submittedBy field found on exercise`);
    }
    
    const result = {
      ...exercise,
      similarExercises,
      authorName
    };
    
    console.log(`📝 Final result authorName: ${result.authorName}`);
    console.log(`📝 Final result author: ${result.author}`);
    console.log(`💾 Caching exercise detail for slug: ${slug} (with ${similarExercises.length} similar exercises)`);
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
  // Fallback to "full-body" tag if no tags provided
  const searchTags = tags.length > 0 ? tags : ["full-body"];
  
  const cacheKey = cacheKeys.similarExercises(excludeId, searchTags, limit);
  console.log(`🔍 getSimilarExercises called - tags: [${searchTags.join(', ')}], excludeId: ${excludeId}, limit: ${limit}`);
  
  const cached = await cache.get<ExerciseListItem[]>(cacheKey);
  
  if (cached) {
    console.log(`✅ getSimilarExercises using cached result with ${cached.length} exercises`);
    return cached;
  }

  console.log('📊 getSimilarExercises cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  
  console.log('Finding similar exercises for tags:', searchTags, 'excluding ID:', excludeId);
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
            $setIntersection: ['$tags', searchTags]
          }
        },
        // Calculate similarity score (percentage of tags that match)
        similarityScore: {
          $cond: {
            if: { $gt: [searchTags.length, 0] },
            then: {
              $divide: [
                { $size: { $setIntersection: ['$tags', searchTags] } },
                searchTags.length
              ]
            },
            else: 0
          }
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
    console.log(`  ${index + 1}. ${exercise.name} - ${exercise.matchingTagsCount}/${searchTags.length} tags (${Math.round(exercise.similarityScore * 100)}% similarity) - ID: ${exercise._id}`);
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
  
  console.log(`💾 Caching similar exercises result (${cleanedExercises.length} exercises)`);
  await cache.set(cacheKey, cleanedExercises, cacheTTL.similarExercises);
  
  return cleanedExercises as ExerciseListItem[];
}

// Search exercises by query and optional tags
export async function searchExercises(
  query: string,
  tags: string[] = [],
  page: number = 1,
  limit: number = 12,
  options?: {
    status?: string;
    userId?: string;
  }
): Promise<{ exercises: ExerciseListItem[]; totalCount: number }> {
  const { status = 'active', userId } = options || {};
  const cacheKey = cacheKeys.searchExercises(query, tags, page, limit) + `_${status}_${userId || 'public'}`;
  console.log(`🔍 searchExercises called - query: "${query}", tags: [${tags.join(', ')}], page: ${page}, limit: ${limit}, status: ${status}, userId: ${userId}`);
  
  const cached = await cache.get<{ exercises: ExerciseListItem[]; totalCount: number }>(cacheKey);
  
  if (cached) {
    console.log(`✅ searchExercises using cached result with ${cached.exercises.length} exercises`);
    return cached;
  }

  console.log('📊 searchExercises cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  const collection = db.collection('exercises');
  
  const skip = (page - 1) * limit;
  
  // Build search pipeline with status filtering
  const searchConditions: any[] = [];
  
  // Status filter - same logic as getAllExercises
  if (status === 'draft' && userId) {
    searchConditions.push({ status: 'draft', submittedBy: userId });
  } else if (status === 'active') {
    searchConditions.push({ status: 'active' });
  } else if (status && ['submitted', 'archived'].includes(status)) {
    searchConditions.push({ status });
  } else {
    searchConditions.push({ status: 'active' });
  }
  
  // Text search conditions
  if (query.trim()) {
    const searchRegex = new RegExp(query.trim(), 'i');
    searchConditions.push({
      $or: [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { text: { $regex: searchRegex } },
        { tags: { $in: [searchRegex] } }
      ]
    });
  }
  
  // Tag filtering
  if (tags.length > 0) {
    searchConditions.push({
      tags: { $in: tags }
    });
  }
  
  const searchFilter = searchConditions.length > 1 ? { $and: searchConditions } : searchConditions[0] || {};
  
  console.log('Search filter:', JSON.stringify(searchFilter, null, 2));
  
  try {
    const exercises = await collection
      .find(searchFilter)
      .sort({ publishedAt: -1, createdAt: -1 })
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
        status: 1,
        submittedBy: 1,
        submittedAt: 1,
      })
      .toArray();
    
    const totalCount = await collection.countDocuments(searchFilter);
    
    console.log(`Found ${exercises.length} exercises matching search criteria (total: ${totalCount})`);
    
    const result = { exercises, totalCount };
    console.log(`💾 Caching searchExercises result (${exercises.length} exercises, ${totalCount} total)`);
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
  console.log(`🔍 getPopularTags called - limit: ${limit}`);
  
  const cached = await cache.get<{ tag: string; count: number }[]>(cacheKey);
  
  if (cached) {
    console.log(`✅ getPopularTags using cached result with ${cached.length} tags`);
    return cached;
  }

  console.log('📊 getPopularTags cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  
  const pipeline = [
    { $match: { status: 'active' } }, // Only include active exercises
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
  
  console.log(`💾 Caching popular tags result (${result.length} tags)`);
  if (result.length > 0) {
    console.log('Top tags:', result.slice(0, 5).map(t => `${t.tag} (${t.count})`).join(', '));
  }
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

// Create a new exercise
export async function createExercise(exerciseData: {
  name: string;
  description: string;
  text: string;
  tags: string[];
  difficulty: number;
  video_url?: string;
  image_url?: string;
  status: ExerciseStatus;
  submittedBy?: string;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
}): Promise<Exercise> {
  console.log('🎯 createExercise called with data:', {
    name: exerciseData.name,
    status: exerciseData.status,
    tags: exerciseData.tags,
  });

  const db = await getDatabase();
  const collection = db.collection('exercises');

  // Generate URL slug from name
  const urlSlug = exerciseData.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();

  // Ensure URL slug is unique
  let finalUrlSlug = urlSlug;
  let counter = 1;
  while (await collection.findOne({ urlSlug: finalUrlSlug })) {
    finalUrlSlug = `${urlSlug}-${counter}`;
    counter++;
  }

  // Generate a unique string ID (instead of letting MongoDB create an ObjectId)
  const generateStringId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}${random}`;
  };

  let exerciseId = generateStringId();
  // Ensure ID is unique
  while (await collection.findOne({ _id: exerciseId })) {
    exerciseId = generateStringId();
  }

  const now = new Date();
  const insertData = {
    _id: exerciseId, // Explicitly set string ID
    name: exerciseData.name,
    description: exerciseData.description,
    text: exerciseData.text,
    tags: exerciseData.tags,
    difficulty: exerciseData.difficulty,
    video_url: exerciseData.video_url || '',
    image_url: exerciseData.image_url || '',
    urlSlug: finalUrlSlug,
    status: exerciseData.status,
    submittedBy: exerciseData.submittedBy,
    submittedAt: exerciseData.submittedAt || now,
    approvedBy: exerciseData.approvedBy,
    approvedAt: exerciseData.approvedAt,
    createdAt: { $date: { $numberLong: now.getTime().toString() } },
    updatedAt: { $date: { $numberLong: now.getTime().toString() } },
    publishedAt: exerciseData.status === 'active' ? now : undefined,
    // Required fields for Exercise interface
    aliases: [],
    author: exerciseData.submittedBy || 'Anonymous',
    confidence: 0.8,
    postURL: '',
    quality: 0.8,
  };

  try {
    const result = await collection.insertOne(insertData as any); // Cast to any to allow string _id
    console.log('✅ Exercise created successfully:', exerciseId);

    // Clear relevant caches
    await cache.delete(cacheKeys.allExercises(1, 12));
    console.log('🗑️ Cleared exercises cache');

    // Return the created exercise with the string ID
    const exercise: Exercise = {
      ...insertData,
      _id: exerciseId, // Use the string ID we generated
    };

    return exercise;
  } catch (error) {
    console.error('❌ Error creating exercise:', error);
    throw error;
  }
}