export const WORKOUT_TAGS = {
  // Core categories
  CORE: 'core',
  MERKIN: 'merkin',
  FULL_BODY: 'full-body',
  LOWER_BODY: 'lower-body',
  UPPER_BODY: 'upper-body',
  ROUTINE: 'routine',
  ENDURANCE: 'endurance',
  
  // Exercise types
  PLANK: 'plank',
  PLYOMETRICS: 'plyometrics',
  RUN: 'run',
  SQUATS: 'squats',
  BURPEE: 'burpee',
  LUNGES: 'lunges',
  CRAWL: 'crawl',
  JUMP: 'jump',
  SPRINTS: 'sprints',
  FLEXIBILITY: 'flexibility',
  
  // Equipment/Props
  COUPON: 'coupon',
  PARTNER: 'partner',
  PULL_UP_BAR: 'pull-up-bar',
  TIMER: 'timer',
  MUSIC: 'music',
  
  // Body parts
  TRICEPS: 'triceps',
  SHOULDERS: 'shoulders',
  CHEST: 'chest',
  GLUTES: 'glutes',
  CALVES: 'calves',
  
  // Locations/Environment
  FIELD: 'field',
  BENCH: 'bench',
  PARKING_LOT: 'parking-lot',
  STAIRS: 'stairs',
  HILL: 'hill',
  TRACK: 'track',
  PLAYGROUND_SWING: 'playground-swing',
  PLAYGROUND: 'playground',
  WATER: 'water',
  
  // Special categories
  GAME: 'game',
  BASE_ROUTINE: 'base-routine',
} as const;

// Create a union type from the values
export type WorkoutTag = typeof WORKOUT_TAGS[keyof typeof WORKOUT_TAGS];

// Array of all workout tags for easy iteration
export const WORKOUT_TAG_LIST: WorkoutTag[] = Object.values(WORKOUT_TAGS);

// Tag to image mapping - prioritizing specific/unique images first
const TAG_IMAGE_MAP: Record<WorkoutTag, string> = {
  // Direct matches (highest priority - most unique)
  [WORKOUT_TAGS.STAIRS]: '/categories/stairs.png',
  [WORKOUT_TAGS.CRAWL]: '/categories/crawl.png',
  [WORKOUT_TAGS.PLANK]: '/categories/plank.png',
  [WORKOUT_TAGS.MUSIC]: '/categories/music.png',
  [WORKOUT_TAGS.PULL_UP_BAR]: '/categories/pull-up-bar.png',
  [WORKOUT_TAGS.GAME]: '/categories/game.png',
  [WORKOUT_TAGS.TRACK]: '/categories/track.png',
  [WORKOUT_TAGS.PLYOMETRICS]: '/categories/plyometrics.png',
  [WORKOUT_TAGS.ROUTINE]: '/categories/routine.png',
  [WORKOUT_TAGS.RUN]: '/categories/run.png',
  [WORKOUT_TAGS.TIMER]: '/categories/timer.png',
  [WORKOUT_TAGS.PARTNER]: '/categories/partner.png',
  [WORKOUT_TAGS.JUMP]: '/categories/jump.png',
  [WORKOUT_TAGS.CORE]: '/categories/core.png',
  [WORKOUT_TAGS.SQUATS]: '/categories/squat.png', // Note: image is 'squat.png'
  [WORKOUT_TAGS.COUPON]: '/categories/coupon.png',
  [WORKOUT_TAGS.MERKIN]: '/categories/merkin.png',


  // Fallback mappings (medium priority - using full-body as default)
  [WORKOUT_TAGS.ENDURANCE]: '/categories/run.png',
  [WORKOUT_TAGS.BURPEE]: '/categories/merkin.png',
  [WORKOUT_TAGS.LUNGES]: '/categories/lower-body.png',
  [WORKOUT_TAGS.SPRINTS]: '/categories/run.png',
  [WORKOUT_TAGS.FLEXIBILITY]: '/categories/full-body.png',
  [WORKOUT_TAGS.TRICEPS]: '/categories/upper-body.png',
  [WORKOUT_TAGS.SHOULDERS]: '/categories/upper-body.png',
  [WORKOUT_TAGS.CHEST]: '/categories/upper-body.png',
  [WORKOUT_TAGS.GLUTES]: '/categories/lower-body.png',
  [WORKOUT_TAGS.CALVES]: '/categories/lower-body.png',
  [WORKOUT_TAGS.BENCH]: '/categories/plyometrics.png',
  [WORKOUT_TAGS.PARKING_LOT]: '/categories/full-body.png',
  [WORKOUT_TAGS.HILL]: '/categories/run.png',
  [WORKOUT_TAGS.PLAYGROUND_SWING]: '/categories/full-body.png',
  [WORKOUT_TAGS.PLAYGROUND]: '/categories/full-body.png',
  [WORKOUT_TAGS.WATER]: '/categories/full-body.png',
  [WORKOUT_TAGS.BASE_ROUTINE]: '/categories/routine.png',
  [WORKOUT_TAGS.FIELD]: '/categories/full-body.png',

  // Body part mappings (low priority)
  [WORKOUT_TAGS.UPPER_BODY]: '/categories/upper-body.png',
  [WORKOUT_TAGS.LOWER_BODY]: '/categories/lower-body.png',
  [WORKOUT_TAGS.FULL_BODY]: '/categories/full-body.png',
};

// Helper function to check if a string is a valid workout tag
export function isValidWorkoutTag(tag: string): tag is WorkoutTag {
  return WORKOUT_TAG_LIST.includes(tag as WorkoutTag);
}

// Function to get the image for a workout tag
export function getTagImage(tag: WorkoutTag): string {
  return TAG_IMAGE_MAP[tag];
}

// Function to get the best tag from an array of tags (prioritizing more specific tags)
export function getBestTag(tags: string[]): WorkoutTag {
  if (tags.length === 0) return WORKOUT_TAGS.FULL_BODY;
  
  // Priority order: unique specific tags first, then general ones
  const priorityTags = [
    WORKOUT_TAGS.STAIRS, WORKOUT_TAGS.CRAWL, WORKOUT_TAGS.PLANK, WORKOUT_TAGS.MUSIC,
    WORKOUT_TAGS.PULL_UP_BAR, WORKOUT_TAGS.FIELD, WORKOUT_TAGS.GAME, WORKOUT_TAGS.TRACK,
    WORKOUT_TAGS.PLYOMETRICS, WORKOUT_TAGS.RUN, WORKOUT_TAGS.TIMER, WORKOUT_TAGS.PARTNER,
    WORKOUT_TAGS.JUMP, WORKOUT_TAGS.CORE, WORKOUT_TAGS.SQUATS, WORKOUT_TAGS.COUPON,
    WORKOUT_TAGS.MERKIN, WORKOUT_TAGS.UPPER_BODY, WORKOUT_TAGS.LOWER_BODY
  ];
  
  // Find the first priority tag that exists in the exercise tags
  for (const priorityTag of priorityTags) {
    if (tags.includes(priorityTag)) {
      return priorityTag;
    }
  }
  
  // If no priority tag found, use the first valid tag or default to full-body
  const firstValidTag = tags.find(tag => isValidWorkoutTag(tag)) as WorkoutTag;
  return firstValidTag || WORKOUT_TAGS.FULL_BODY;
}

// Function to get image for the best tag from an array of tags
export function getTagImageFromTags(tags: string[]): string {
  const bestTag = getBestTag(tags);
  return getTagImage(bestTag);
}

// Function to get image with fallback for invalid tags
export function getTagImageSafe(tag: string): string {
  if (isValidWorkoutTag(tag)) {
    return getTagImage(tag);
  }
  // Default fallback image
  return '/categories/full-body.png';
}

// Type for workout tag categories
export type WorkoutTagCategory = 
  | 'core-categories'
  | 'exercise-types'
  | 'equipment-props'
  | 'body-parts'
  | 'locations-environment'
  | 'special-categories';

// Categorized tags for UI organization
export const WORKOUT_TAG_CATEGORIES: Record<WorkoutTagCategory, WorkoutTag[]> = {
  'core-categories': [
    WORKOUT_TAGS.CORE,
    WORKOUT_TAGS.MERKIN,
    WORKOUT_TAGS.FULL_BODY,
    WORKOUT_TAGS.LOWER_BODY,
    WORKOUT_TAGS.UPPER_BODY,
    WORKOUT_TAGS.ROUTINE,
    WORKOUT_TAGS.ENDURANCE,
  ],
  'exercise-types': [
    WORKOUT_TAGS.PLANK,
    WORKOUT_TAGS.PLYOMETRICS,
    WORKOUT_TAGS.RUN,
    WORKOUT_TAGS.SQUATS,
    WORKOUT_TAGS.BURPEE,
    WORKOUT_TAGS.LUNGES,
    WORKOUT_TAGS.CRAWL,
    WORKOUT_TAGS.JUMP,
    WORKOUT_TAGS.SPRINTS,
    WORKOUT_TAGS.FLEXIBILITY,
  ],
  'equipment-props': [
    WORKOUT_TAGS.COUPON,
    WORKOUT_TAGS.PARTNER,
    WORKOUT_TAGS.PULL_UP_BAR,
    WORKOUT_TAGS.TIMER,
    WORKOUT_TAGS.MUSIC,
  ],
  'body-parts': [
    WORKOUT_TAGS.TRICEPS,
    WORKOUT_TAGS.SHOULDERS,
    WORKOUT_TAGS.CHEST,
    WORKOUT_TAGS.GLUTES,
    WORKOUT_TAGS.CALVES,
  ],
  'locations-environment': [
    WORKOUT_TAGS.FIELD,
    WORKOUT_TAGS.BENCH,
    WORKOUT_TAGS.PARKING_LOT,
    WORKOUT_TAGS.STAIRS,
    WORKOUT_TAGS.HILL,
    WORKOUT_TAGS.TRACK,
    WORKOUT_TAGS.PLAYGROUND_SWING,
    WORKOUT_TAGS.PLAYGROUND,
    WORKOUT_TAGS.WATER,
  ],
  'special-categories': [
    WORKOUT_TAGS.GAME,
    WORKOUT_TAGS.BASE_ROUTINE,
  ],
};

// Helper function to get display name from kebab-case tag
export function getTagDisplayName(tag: WorkoutTag): string {
  return tag
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to get category for a specific tag
export function getTagCategory(tag: WorkoutTag): WorkoutTagCategory | null {
  for (const [category, tags] of Object.entries(WORKOUT_TAG_CATEGORIES)) {
    if (tags.includes(tag)) {
      return category as WorkoutTagCategory;
    }
  }
  return null;
} 