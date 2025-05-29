/**
 * ==========================================
 * ATLAS SEARCH CONFIGURATION
 * ==========================================
 * 
 * This is your search "control panel" - modify these settings to tune search behavior.
 * 
 * 🔍 KEY CONCEPTS:
 * 
 * • FUZZY SEARCH: Handles typos like "burpe" → "burpee"
 * • EDIT DISTANCE: Number of character changes needed ("cat" → "bat" = 1 edit)
 * • RELEVANCE SCORING: Higher scores = better matches
 * • FIELD WEIGHTING: Exercise names are more important than full text content
 */

export interface SearchConfig {

  // ==========================================
  // FUZZY MATCHING - Controls typo tolerance
  // ==========================================
  fuzzy: {
    enabled: boolean;           // Master switch: allow typos or require exact matches?

    maxEdits: {
      short: number;            // Max typos for short queries (≤5 chars) - keep low to avoid false positives
      long: number;             // Max typos for longer queries (>5 chars) - can be higher
    };

    prefixLength: number;       // How many starting characters must match exactly
    // Example: prefixLength=2 means "music" can only match words starting with "mu"

    maxExpansions: number;      // Performance limit: max fuzzy variations to check
  };

  // ==========================================
  // FIELD IMPORTANCE - Which fields matter most
  // ==========================================
  fieldWeights: {
    name: number;               // Exercise name matches (highest priority)
    description: number;        // Exercise description matches  
    text: number;              // Full text content matches (lowest priority - where false positives happen)
    tags: number;              // Tag matches (high priority)
    aliases: number;           // Alternative name matches (high priority)
  };

  // ==========================================
  // RESULT FILTERING & BEHAVIOR
  // ==========================================
  behavior: {
    scoreThreshold?: number;    // Minimum score to include results (undefined = include all)
    // Set to 0.5 to filter out weak matches like "music" → "must"

    minimumShouldMatch: number; // How many fields must match (1 = at least one field)
  };

  // ==========================================
  // AUTOCOMPLETE SUGGESTIONS
  // ==========================================
  autocomplete: {
    enabled: boolean;           // Enable search-as-you-type suggestions?
    maxEdits: number;          // Typo tolerance for suggestions (usually conservative)
    minQueryLength: number;    // Start suggestions after this many characters
    maxSuggestions: number;    // Max suggestions to show
  };

  // ==========================================
  // PERFORMANCE & CACHING
  // ==========================================
  performance: {
    enableCaching: boolean;     // Master switch: enable/disable all search result caching
    // true = cache results for better performance (recommended)
    // false = always fetch fresh results from database (slower but always current)
    cacheSeconds: number;       // How long to cache results when caching is enabled (300 = 5 minutes)
  };

  // ==========================================
  // DEBUGGING (turn on when troubleshooting)
  // ==========================================
  debug: {
    logQueries: boolean;        // Log the actual search queries being sent
    logScores: boolean;         // Log relevance scores to understand ranking
    enableFallback: boolean;    // Fall back to simple regex search if Atlas Search fails
  };
}

/**
 * ==========================================
 * SEARCH CONFIGURATION
 * ==========================================
 * Modify these values to tune your search behavior
 */
export const searchConfig: SearchConfig = {

  fuzzy: {
    enabled: true,              // Allow typos
    maxEdits: {
      short: 1,                 // Conservative for short queries to prevent "must"→"music" false positives
      long: 2,                  // More permissive for longer queries where false positives are rare
    },
    prefixLength: 1,            // First character must match exactly
    maxExpansions: 50,          // Reasonable performance limit
  },

  fieldWeights: {
    name: 3.0,                  // Exercise names are most important
    description: 2.0,           // Descriptions are high priority
    text: 1.0,                  // Full text is lowest priority (where "must"→"music" happens)
    tags: 2.5,                  // Tags are very important
    aliases: 2.5,               // Alternative names are very important
  },

  behavior: {
    scoreThreshold: undefined,  // Include all matches (set to 0.5 to filter weak matches)
    minimumShouldMatch: 1,      // At least one field must match
  },

  autocomplete: {
    enabled: true,              // Enable search suggestions
    maxEdits: 1,                // Conservative typo tolerance for suggestions
    minQueryLength: 2,          // Start suggestions after 2 characters
    maxSuggestions: 5,          // Show max 5 suggestions
  },

  performance: {
    enableCaching: true,        // Cache results for better performance
    cacheSeconds: 300,          // Cache for 5 minutes
  },

  debug: {
    logQueries: false,          // Set to true when debugging search issues
    logScores: false,           // Set to true to see relevance scores
    enableFallback: true,       // Safe fallback if Atlas Search fails
  },
};

/**
 * ==========================================
 * COMMON FIXES FOR SEARCH ISSUES
 * ==========================================
 * 
 * 🔧 Too many irrelevant results (like "music" finding "must"):
 *    • Set scoreThreshold: 0.5
 *    • Set fuzzy.maxEdits.short: 0  
 *    • Set fuzzy.prefixLength: 2
 * 
 * 🔧 Missing obvious matches:
 *    • Set fuzzy.maxEdits.short: 2
 *    • Set scoreThreshold: undefined
 *    • Set fuzzy.prefixLength: 0
 * 
 * 🔧 Search too slow:
 *    • Set scoreThreshold: 0.5 (filters weak matches early)
 *    • Set fuzzy.maxExpansions: 20
 *    • Set performance.cacheSeconds: 600 (10 minutes)
 *    • Ensure performance.enableCaching: true
 * 
 * 🔧 Need fresh results every time (disable caching):
 *    • Set performance.enableCaching: false
 *    • Useful for development or when data changes frequently
 * 
 * 🔧 Debug search problems:
 *    • Set debug.logQueries: true
 *    • Set debug.logScores: true
 *    • Check console for search pipeline and relevance scores
 * 
 * 🔧 Exercise names not prioritized enough:
 *    • Increase fieldWeights.name to 5.0
 *    • Decrease fieldWeights.text to 0.5
 */