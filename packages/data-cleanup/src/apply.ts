import { CleanupEngine } from './cleanup-engine.js';

async function main() {
  const engine = new CleanupEngine();
  
  try {
    await engine.initialize();
    
    console.log('Applying approved proposals...');
    const appliedCount = await engine.applyApprovedProposals();
    
    console.log(`✓ Applied ${appliedCount} approved changes to the database.`);
    
  } catch (error) {
    console.error('Apply failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

if (require.main === module) {
  main();
}