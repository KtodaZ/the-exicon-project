import { cache, cacheKeys } from '@/lib/redis';
import { Exercise } from '@/lib/models/exercise';

/**
 * Invalidate all caches related to a specific exercise
 */
export async function invalidateExerciseCaches(exercise: {
    _id: string;
    urlSlug: string;
    tags: string[];
    name: string;
}, options?: {
    tagsUpdated?: boolean;
    clearSimilarExercises?: boolean;
    force?: boolean;
}): Promise<void> {
    const { tagsUpdated = false, clearSimilarExercises = true, force = false } = options || {};

    console.log(`🗑️ Invalidating caches for exercise: ${exercise.name} ${force ? '(FORCE)' : ''}`);

    try {
        // Clear the specific exercise cache
        await cache.delete(cacheKeys.exerciseBySlug(exercise.urlSlug));
        console.log(`  ✅ Cleared exercise detail cache: ${exercise.urlSlug}`);

        // If force mode, also clear any variations of the cache key
        if (force) {
            const variations = [
                `${cacheKeys.exerciseBySlug(exercise.urlSlug)}_detailed`,
                `${cacheKeys.exerciseBySlug(exercise.urlSlug)}_summary`,
                `exercise:${exercise.urlSlug}`,
                `exercise_detail:${exercise.urlSlug}`,
            ];
            
            await Promise.all(variations.map(key => cache.delete(key)));
            console.log(`  ✅ Cleared exercise cache variations`);
        }

        // Clear exercises list caches (multiple pages and status variations)
        const statusVariations = ['active', 'submitted', 'draft', 'archived'];
        const clearPromises: Promise<void>[] = [];

        for (let page = 1; page <= 10; page++) { // Increased from 5 to 10
            // Base cache key
            clearPromises.push(cache.delete(cacheKeys.allExercises(page, 12)));

            // Status-specific cache keys
            statusVariations.forEach(status => {
                clearPromises.push(
                    cache.delete(cacheKeys.allExercises(page, 12) + `_${status}_public_all`)
                );
            });
        }

        await Promise.all(clearPromises);
        console.log(`  ✅ Cleared exercises list caches`);

        // Clear similar exercises cache
        if (clearSimilarExercises) {
            await cache.delete(cacheKeys.similarExercises(exercise._id, exercise.tags, 8));
            console.log(`  ✅ Cleared similar exercises cache`);
        }

        // Clear popular tags cache if tags were updated
        if (tagsUpdated) {
            await cache.delete(cacheKeys.popularTags());
            console.log(`  ✅ Cleared popular tags cache`);
        }

        // If force mode, clear additional caches
        if (force) {
            await cache.delete('search:*'); // Clear search caches
            await cache.delete('exercises:*'); // Clear any exercise-related wildcards
            console.log(`  ✅ Cleared additional force-mode caches`);
        }

        console.log(`✅ Cache invalidation complete for exercise: ${exercise.name}`);
    } catch (error) {
        console.error(`❌ Error during cache invalidation for exercise ${exercise.name}:`, error);
        // Don't throw - cache invalidation failure shouldn't break the main operation
    }
}

/**
 * Invalidate all exercise-related caches (nuclear option)
 */
export async function invalidateAllExerciseCaches(): Promise<void> {
    console.log(`🗑️ Invalidating ALL exercise caches`);

    try {
        const clearPromises: Promise<void>[] = [];

        // Clear all exercise list pages
        for (let page = 1; page <= 10; page++) {
            clearPromises.push(cache.delete(cacheKeys.allExercises(page, 12)));
        }

        // Clear popular tags
        clearPromises.push(cache.delete(cacheKeys.popularTags()));

        await Promise.all(clearPromises);

        console.log(`✅ All exercise caches invalidated`);
    } catch (error) {
        console.error(`❌ Error during bulk cache invalidation:`, error);
    }
}

/**
 * Invalidate caches when an exercise is created
 */
export async function invalidateCachesOnExerciseCreate(exercise: {
    _id: string;
    urlSlug: string;
    tags: string[];
    name: string;
    status: string;
}): Promise<void> {
    console.log(`🗑️ Invalidating caches for new exercise: ${exercise.name}`);

    try {
        // Clear exercises list caches - new exercise affects pagination
        const clearPromises: Promise<void>[] = [];

        for (let page = 1; page <= 5; page++) {
            clearPromises.push(cache.delete(cacheKeys.allExercises(page, 12)));
            clearPromises.push(cache.delete(cacheKeys.allExercises(page, 12) + `_${exercise.status}_public_all`));
        }

        // Clear popular tags cache - new exercise might affect tag counts
        clearPromises.push(cache.delete(cacheKeys.popularTags()));

        await Promise.all(clearPromises);

        console.log(`✅ Cache invalidation complete for new exercise: ${exercise.name}`);
    } catch (error) {
        console.error(`❌ Error during cache invalidation for new exercise ${exercise.name}:`, error);
    }
}

/**
 * Invalidate caches when an exercise is deleted
 */
export async function invalidateCachesOnExerciseDelete(exercise: {
    _id: string;
    urlSlug: string;
    tags: string[];
    name: string;
}): Promise<void> {
    console.log(`🗑️ Invalidating caches for deleted exercise: ${exercise.name}`);

    try {
        // Clear the specific exercise cache
        await cache.delete(cacheKeys.exerciseBySlug(exercise.urlSlug));

        // Clear exercises list caches
        const clearPromises: Promise<void>[] = [];

        for (let page = 1; page <= 5; page++) {
            clearPromises.push(cache.delete(cacheKeys.allExercises(page, 12)));
        }

        // Clear popular tags cache
        clearPromises.push(cache.delete(cacheKeys.popularTags()));

        await Promise.all(clearPromises);

        console.log(`✅ Cache invalidation complete for deleted exercise: ${exercise.name}`);
    } catch (error) {
        console.error(`❌ Error during cache invalidation for deleted exercise ${exercise.name}:`, error);
    }
} 