import { LexiconCleanupEngine } from './lexicon-cleanup-engine.js';

async function main() {
  const engine = new LexiconCleanupEngine();
  
  try {
    await engine.initialize();
    
    // Get proposal ID from command line arguments
    const proposalId = process.argv[2];
    
    if (!proposalId) {
      console.error('Please provide a proposal ID');
      console.error('Usage: pnpm run lexicon:approve <proposalId>');
      process.exit(1);
    }
    
    await engine.approveProposal(proposalId);
    
  } catch (error) {
    console.error('Approval failed:', error);
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