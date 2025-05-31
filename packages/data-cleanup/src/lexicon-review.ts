import { LexiconCleanupEngine } from './lexicon-cleanup-engine.js';

async function main() {
  const engine = new LexiconCleanupEngine();
  
  try {
    await engine.initialize();
    await engine.reviewProposals('description');
  } catch (error) {
    console.error('Review failed:', error);
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