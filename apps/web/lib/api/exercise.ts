import { getDatabase } from '@/lib/mongodb';
import { Exercise, ExerciseListItem, ExerciseDetail, ExerciseStatus } from '@/lib/models/exercise';
import { cache, cacheKeys, cacheTTL } from '@/lib/redis';
import { searchConfig } from '@/lib/config/search';
import { ObjectId } from 'mongodb';
import { invalidateCachesOnExerciseCreate } from '@/lib/cache-invalidation';

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
    hasVideo?: boolean;
  }
): Promise<{ exercises: ExerciseListItem[]; totalCount: number }> {
  const { status = 'active', userId, hasVideo } = options || {};

  const cacheKey = cacheKeys.allExercises(page, limit) + `_${status}_${userId || 'public'}_${hasVideo || 'all'}`;
  console.log(`🔍 getAllExercises called - page: ${page}, limit: ${limit}, status: ${status}, userId: ${userId}, hasVideo: ${hasVideo}`);

  const cached = await cache.get<{ exercises: ExerciseListItem[]; totalCount: number }>(cacheKey);

  if (cached) {
    console.log(`✅ getAllExercises using cached result with ${cached.exercises.length} exercises`);
    return cached;
  }

  console.log('📊 getAllExercises cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  const collection = db.collection('exercises');

  const skip = (page - 1) * limit;

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

    // Add video filter if specified
    if (hasVideo === true) {
      filter.video_url = { $exists: true, $nin: ['', null] };
    } else if (hasVideo === false) {
      filter.$or = [
        { video_url: { $exists: false } },
        { video_url: { $in: ['', null] } }
      ];
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

    if (exercises.length === 0) {
      console.warn('Query returned no exercises');
      return { exercises: [], totalCount: totalDocuments };
    }

    const result = { exercises, totalCount: totalDocuments };
    console.log(`💾 Caching getAllExercises result (${exercises.length} exercises, ${totalDocuments} total)`);
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

// Atlas Search implementation
export async function searchExercisesWithAtlas(
  query: string,
  tags: string[] = [],
  page: number = 1,
  limit: number = 12,
  options?: {
    status?: string;
    userId?: string;
    fuzzy?: boolean;
  }
): Promise<{ exercises: (ExerciseListItem & { score?: number })[]; totalCount: number }> {
  // LOG INCOMING PARAMETERS FOR DIAGNOSTICS
  console.log('[searchExercisesWithAtlas] Received query:', query);
  console.log('[searchExercisesWithAtlas] Received tags:', JSON.stringify(tags));
  console.log('[searchExercisesWithAtlas] Received options:', JSON.stringify(options));

  const { status = 'active', userId, fuzzy = searchConfig.fuzzy.enabled } = options || {};

  // Separate video filter from actual tags
  const hasVideoFilter = tags.includes('video');
  const actualTags = tags.filter(tag => tag !== 'video');

  const cacheKey = cacheKeys.searchExercises(query, tags, page, limit) + `_${status}_${userId || 'public'}_atlas`;
  console.log(`🔍 searchExercisesWithAtlas called - query: "${query}", tags: [${tags.join(', ')}], hasVideoFilter: ${hasVideoFilter}`);

  const cached = await cache.get<{ exercises: (ExerciseListItem & { score?: number })[]; totalCount: number }>(cacheKey);

  if (cached) {
    console.log(`✅ searchExercisesWithAtlas using cached result with ${cached.exercises.length} exercises`);
    return cached;
  }

  console.log('📊 searchExercisesWithAtlas cache miss - fetching from MongoDB...');
  const db = await getDatabase();
  const collection = db.collection('exercises');

  const skip = (page - 1) * limit;

  let searchStage: any = null;

  if (query.trim() || actualTags.length > 0) {
    // Build compound search for query + tags combination
    const mustClauses: any[] = [];
    const shouldClauses: any[] = [];

    // Add text search if query provided
    if (query.trim()) {
      // Original hierarchical structure for other queries
      const otherFieldsShouldClauses: any[] = [
        {
          text: {
            query: query.trim(),
            path: ["name"],
            score: { boost: { value: searchConfig.fieldWeights.name } }
          }
        },
        {
          text: {
            query: query.trim(),
            path: ["description"],
            score: { boost: { value: searchConfig.fieldWeights.description } }
          }
        },
        {
          text: {
            query: query.trim(),
            path: ["text"],
            fuzzy: fuzzy ? {
              maxEdits: query.trim().length <= 5
                ? searchConfig.fuzzy.maxEdits.short
                : searchConfig.fuzzy.maxEdits.long,
              prefixLength: searchConfig.fuzzy.prefixLength,
              maxExpansions: searchConfig.fuzzy.maxExpansions
            } : undefined,
            score: { boost: { value: searchConfig.fieldWeights.text } }
          }
        },
        {
          text: {
            query: query.trim(),
            path: ["tags"],  // Only search tags array, not categories string
            score: { boost: { value: searchConfig.fieldWeights.tags } }
          }
        },
        // Optionally, re-include the general text search on aliases.name here with a moderate boost
        // if you still want non-phrase alias matches to contribute, but less than the primary phrase:
        // {
        //   text: {
        //     query: query.trim(),
        //     path: ["aliases.name"],
        //     score: { boost: { value: searchConfig.fieldWeights.aliases / 2 } } // e.g., half of original alias weight
        //   }
        // }
      ];

      searchStage = {
        $search: {
          index: "default",
          compound: {
            should: [
              { // Clause 1: ALIAS PHRASE (very high priority)
                phrase: {
                  query: query.trim(), // Reverted from hardcoded
                  path: "aliases.name",
                  slop: 0,
                  score: { boost: { value: 100 } } // Using a high, fixed-style boost
                }
              },
              { // Clause 2: ALL OTHER FIELDS (as a nested compound)
                compound: {
                  should: otherFieldsShouldClauses,
                  minimumShouldMatch: searchConfig.behavior.minimumShouldMatch // Apply original minimumShouldMatch here
                }
              }
            ],
            minimumShouldMatch: 1 // For the outer group: match alias OR other fields
          }
        }
      };
      // }
    } else {
      // No search criteria - use regular MongoDB query
      const filter: any = {};
      if (status === 'draft' && userId) {
        filter.status = 'draft';
        filter.submittedBy = userId;
      } else if (status === 'active') {
        filter.status = 'active';
      } else if (status && ['submitted', 'archived'].includes(status)) {
        filter.status = status;
      } else {
        filter.status = 'active';
      }

      // Add video filter if needed
      if (hasVideoFilter) {
        filter.video_url = { $exists: true, $nin: ['', null] };
      }

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

      const totalCount = await collection.countDocuments(filter);
      const result = { exercises, totalCount };
      await cache.set(cacheKey, result, cacheTTL.searchResults);
      return result;
    }
  } else {
    // No search criteria - use regular MongoDB query
    const filter: any = {};
    if (status === 'draft' && userId) {
      filter.status = 'draft';
      filter.submittedBy = userId;
    } else if (status === 'active') {
      filter.status = 'active';
    } else if (status && ['submitted', 'archived'].includes(status)) {
      filter.status = status;
    } else {
      filter.status = 'active';
    }

    // Add video filter if needed
    if (hasVideoFilter) {
      filter.video_url = { $exists: true, $nin: ['', null] };
    }

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

    const totalCount = await collection.countDocuments(filter);
    const result = { exercises, totalCount };
    await cache.set(cacheKey, result, cacheTTL.searchResults);
    return result;
  }

  const pipeline = [
    searchStage,
    {
      $addFields: {
        score: { $meta: "searchScore" }
      }
    }
  ];

  // Add score threshold filtering if configured
  if (searchConfig.behavior.scoreThreshold !== undefined) {
    pipeline.push({
      $match: {
        score: { $gte: searchConfig.behavior.scoreThreshold }
      }
    });
  }

  // Add status filtering after search
  const statusMatch: any = {};
  if (status === 'draft' && userId) {
    statusMatch.status = 'draft';
    statusMatch.submittedBy = userId;
  } else if (status === 'active') {
    statusMatch.status = 'active';
  } else if (status && ['submitted', 'archived'].includes(status)) {
    statusMatch.status = status;
  } else {
    statusMatch.status = 'active';
  }

  // Add video filter if needed
  if (hasVideoFilter) {
    statusMatch.video_url = { $exists: true, $nin: ['', null] };
  }

  pipeline.push({
    $match: statusMatch
  });

  pipeline.push(
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
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
        score: 1
      }
    }
  );

  if (searchConfig.debug.logQueries) {
    console.log('Atlas Search pipeline:', JSON.stringify(pipeline, null, 2));
  }

  try {
    console.log('Running Atlas search aggregation...');
    const exercises = await collection.aggregate(pipeline).toArray() as (ExerciseListItem & { score?: number })[];

    // Get total count using a simpler aggregation (without skip/limit)
    const countPipeline = [
      searchStage,
      {
        $addFields: {
          score: { $meta: "searchScore" }
        }
      }
    ];

    if (searchConfig.behavior.scoreThreshold !== undefined) {
      countPipeline.push({
        $match: {
          score: { $gte: searchConfig.behavior.scoreThreshold }
        }
      });
    }

    countPipeline.push({
      $match: statusMatch
    });

    countPipeline.push({
      $count: "total"
    });

    const countResult = await collection.aggregate(countPipeline).toArray();
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    console.log(`Atlas search found ${exercises.length} exercises (total: ${totalCount})`);

    const result = { exercises, totalCount };
    console.log(`💾 Caching Atlas search result (${exercises.length} exercises, ${totalCount} total)`);
    await cache.set(cacheKey, result, cacheTTL.searchResults);

    return result;
  } catch (error) {
    console.error('Error in searchExercisesWithAtlas:', error);
    throw error;
  }
}

// Atlas Search autocomplete implementation
export async function getSearchSuggestions(
  query: string,
  limit: number = searchConfig.autocomplete.maxSuggestions
): Promise<string[]> {
  if (!searchConfig.autocomplete.enabled ||
    !query.trim() ||
    query.length < searchConfig.autocomplete.minQueryLength) {
    return [];
  }

  const cacheKey = `suggestions_${query.trim()}_${limit}`;
  console.log(`🔍 getSearchSuggestions called - query: "${query}", limit: ${limit}`);

  // Check cache only if caching is enabled
  if (searchConfig.performance.enableCaching) {
    const cached = await cache.get<string[]>(cacheKey);

    if (cached) {
      if (searchConfig.debug.logQueries) {
        console.log(`✅ getSearchSuggestions using cached result with ${cached.length} suggestions`);
      }
      return cached;
    }
  }

  console.log('📊 getSearchSuggestions cache miss - fetching from MongoDB with Atlas Search...');
  const db = await getDatabase();
  const collection = db.collection('exercises');

  try {
    const pipeline = [
      {
        $search: {
          index: "default",
          compound: {
            must: [
              {
                autocomplete: {
                  query: query.trim(),
                  path: "name",
                  fuzzy: {
                    maxEdits: searchConfig.autocomplete.maxEdits,
                    prefixLength: searchConfig.fuzzy.prefixLength
                  }
                }
              }
            ],
            filter: [
              {
                equals: { path: "status", value: "active" }
              }
            ]
          }
        }
      },
      {
        $limit: limit
      },
      {
        $project: {
          name: 1,
          score: { $meta: "searchScore" }
        }
      }
    ];

    const results = await collection
      .aggregate(pipeline)
      .toArray();

    const suggestions = results.map(r => r.name);

    if (searchConfig.debug.logScores) {
      console.log(`Found ${suggestions.length} search suggestions`);
    }

    // Only cache if caching is enabled
    if (searchConfig.performance.enableCaching) {
      if (searchConfig.debug.logQueries) {
        console.log(`💾 Caching search suggestions result`);
      }
      await cache.set(cacheKey, suggestions, searchConfig.performance.cacheSeconds);
    }

    return suggestions;
  } catch (error) {
    console.error('Error in getSearchSuggestions:', error);
    return [];
  }
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

  // Separate video filter from actual tags
  const hasVideoFilter = tags.includes('video');
  const actualTags = tags.filter(tag => tag !== 'video');

  const cacheKey = cacheKeys.searchExercises(query, tags, page, limit) + `_${status}_${userId || 'public'}`;
  console.log(`🔍 searchExercises called - query: "${query}", tags: [${tags.join(', ')}], page: ${page}, limit: ${limit}, status: ${status}, userId: ${userId}, hasVideoFilter: ${hasVideoFilter}`);

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

  // Tag filtering (excluding 'video' which is handled separately)
  if (actualTags.length > 0) {
    searchConditions.push({
      tags: { $in: actualTags }
    });
  }

  // Video filter - check for non-empty video_url
  if (hasVideoFilter) {
    searchConditions.push({
      video_url: { $exists: true, $nin: ['', null] }
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

// Debug Atlas Search function
export async function debugAtlasSearch(): Promise<any> {
  const db = await getDatabase();
  const collection = db.collection('exercises');

  try {
    // Check if we have any active exercises
    const activeCount = await collection.countDocuments({ status: 'active' });
    console.log('Active exercises count:', activeCount);

    // Get a sample active exercise
    const sampleExercise = await collection.findOne({ status: 'active' });
    console.log('Sample active exercise:', sampleExercise);

    // Try a simple Atlas Search without filters
    const simpleSearchPipeline = [
      {
        $search: {
          index: "default",
          text: {
            query: "burpee",
            path: ["name", "description", "text"]
          }
        }
      },
      {
        $limit: 5
      },
      {
        $project: {
          name: 1,
          status: 1,
          score: { $meta: "searchScore" }
        }
      }
    ];

    console.log('Simple search pipeline:', JSON.stringify(simpleSearchPipeline, null, 2));
    const simpleResults = await collection.aggregate(simpleSearchPipeline).toArray();
    console.log('Simple search results:', simpleResults);

    // Try regex search for comparison
    const regexResults = await collection.find({
      $and: [
        { status: 'active' },
        {
          $or: [
            { name: { $regex: /burpee/i } },
            { description: { $regex: /burpee/i } },
            { text: { $regex: /burpee/i } }
          ]
        }
      ]
    }).limit(5).toArray();

    console.log('Regex search results count:', regexResults.length);
    if (regexResults.length > 0) {
      console.log('First regex result:', regexResults[0].name);
    }

    return {
      activeCount,
      sampleExercise: sampleExercise ? { name: sampleExercise.name, status: sampleExercise.status } : null,
      simpleSearchResults: simpleResults.length,
      regexResults: regexResults.length,
      regexResultNames: regexResults.map(r => r.name)
    };
  } catch (error) {
    console.error('Error in debugAtlasSearch:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
    await invalidateCachesOnExerciseCreate({
      _id: exerciseId,
      urlSlug: finalUrlSlug,
      tags: exerciseData.tags,
      name: exerciseData.name,
      status: exerciseData.status
    });

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