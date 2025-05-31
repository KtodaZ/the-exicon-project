import { LexiconAliasEngine } from './lexicon-alias-engine.js';

async function main() {
  const engine = new LexiconAliasEngine();
  
  try {
    await engine.initialize();
    
    // Run alias detection on a batch of lexicon items
    const results = await engine.runAliasDetection(20);
    
    console.log(`\nProcessed ${results.length} lexicon items for alias detection`);
    
  } catch (error) {
    console.error('Lexicon alias cleanup failed:', error);
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