import { LexiconCleanupEngine } from './lexicon-cleanup-engine.js';
import { CleanupConfig } from './types.js';

async function main() {
  const engine = new LexiconCleanupEngine();
  
  try {
    await engine.initialize();
    
    // Description cleanup configuration for lexicon items
    const descriptionCleanup: CleanupConfig = {
      field: 'description',
      prompt: `Clean up the description field for this F3 lexicon term by ONLY removing HTML artifacts and formatting. 

CRITICAL REQUIREMENTS:
- Remove ONLY HTML tags, style attributes, and formatting elements
- Remove font family specifications (like "Calibri, Arial", "docs-Calibri", etc.)
- Remove color and style attributes (style="...", color="...", etc.)
- Fix HTML entity encoding (&nbsp; → space, &amp; → &, etc.)
- DO NOT change any original text, spelling, capitalization, or punctuation
- DO NOT add or remove commas, periods, or other punctuation
- DO NOT change word capitalization (keep "Team" as "Team", "Effective" as "Effective", etc.)
- DO NOT rephrase or reword anything
- DO NOT fix grammar or improve sentence structure
- PRESERVE the exact original text content character-for-character
- If the content has no HTML artifacts, return it completely unchanged

The goal is ONLY to strip away HTML formatting while preserving the original author's exact text, spelling, and capitalization.

Examples:
- "<span style='font-family: Calibri'>Short for King Of Birds.</span>" → "Short for King Of Birds."
- "<p style='margin-left: 0px'>Text here</p>" → "Text here"
- "Text with&nbsp;spaces" → "Text with spaces"`,
      model: 'gpt-4o-mini',
      maxTokens: 300,
      temperature: 0.1, // Very low temperature for consistent, conservative formatting
      batchSize: 20
    };

    console.log('Starting lexicon description cleanup...');
    console.log('This will clean up HTML tags and formatting while preserving original content and F3 terminology\n');
    
    const results = await engine.runCleanup(descriptionCleanup);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\nLexicon cleanup complete!`);
    console.log(`- Successful proposals: ${successful}`);
    console.log(`- Failed/skipped: ${failed}`);
    
    if (successful > 0) {
      console.log(`\nTo review pending proposals:`);
      console.log(`cd packages/data-cleanup && pnpm run lexicon:review`);
    }
    
  } catch (error) {
    console.error('Lexicon cleanup failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default main; 