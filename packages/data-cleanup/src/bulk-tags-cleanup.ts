import { CleanupEngine } from './cleanup-engine.js';
import { CleanupConfig } from './types.js';
import { config } from './config.js';

async function main() {
  const engine = new CleanupEngine();
  
  try {
    await engine.initialize();
    
    // Enable auto-approval for bulk processing
    config.cleanup.autoApprove = true;
    config.cleanup.reviewRequired = false;
    
    console.log('🏷️  BULK TAGS CLEANUP MODE');
    console.log('📊 Processing ALL exercises with missing/few tags in batches of 30');
    console.log('⚠️  All tag proposals will be automatically applied!\n');
    
    const tagsCleanup: CleanupConfig = {
      field: 'tags',
      prompt: `Analyze the exercise and determine appropriate tags. Possible tags are:
- upper-body
- shoulders  
- chest
- triceps
- lower-body
- glutes
- squats
- calves
- lunges
- core
- plank
- full-body
- burpee
- merkin
- crawl
- flexibility (involving a stretch)
- endurance (e.g. cardio)
- sprints
- run
- plyometrics
- hill
- stairs
- routine (consisting of multiple exercises in one)
- base-routine (a routine that can be used to design a workout, e.g. 11s, Dora, etc)
- partner (involves 1 or 2 partners, not a group)
- coupon (a coupon is a weight like a block)
- bench (involves a bench or platform or box)
- pull-up-bar
- playground-swing
- water
- timer
- music (involves music)
- field
- parking-lot
- playground
- track
- game
- jump

Some basic definitions that may help determine the tags:
- Murder Bunny: bending over with hands on the block, hop forward, and once landed pick up the block and move it as far forward as you can reach, then repeat
- Merkin: push up (derkin - decline pushup)
- Dora: A routine involving a partner where you must perform a specifc number of reps of an exercise together
- 11s: A ladder exercise in which you start with 1 rep of one exercise and 10 reps of another exercise, then add one additional rep to the first exercise and subtract one rep from the second
- 6 Minutes of Marys: abs routine
- al gore: holding a squat
- SSH / side stradel hop: jumping jack

Select the most appropriate tags for this exercise based on the text description.

Return JSON format: {"value": ["tag1", "tag2", "tag3"], "reason": "brief explanation of tag selection", "confidence": 0.9}`,
      model: 'gpt-4o-mini',
      maxTokens: 200,
      temperature: 0.3,
      batchSize: 30
    };

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let batchNumber = 1;
    
    console.log('Starting bulk tags cleanup...\n');
    
    while (true) {
      console.log(`\n--- BATCH ${batchNumber} ---`);
      
      const results = await engine.runCleanup(tagsCleanup);
      
      if (results.length === 0) {
        console.log('🎉 All exercises with missing tags processed!');
        break;
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      totalProcessed += results.length;
      totalSuccessful += successful;
      totalFailed += failed;
      
      console.log(`Batch ${batchNumber}: ✅ ${successful} successful, ❌ ${failed} failed`);
      console.log(`Running total: ${totalProcessed} processed, ${totalSuccessful} successful`);
      
      batchNumber++;
      
      // Small delay between batches to be respectful to APIs
      if (results.length > 0) {
        console.log('Waiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`\n🎯 BULK TAGS CLEANUP COMPLETE!`);
    console.log(`📈 Total processed: ${totalProcessed}`);
    console.log(`✅ Total successful: ${totalSuccessful}`);
    console.log(`❌ Total failed: ${totalFailed}`);
    console.log(`🏷️  All tag changes applied to MongoDB`);
    
  } catch (error) {
    console.error('Bulk tags cleanup failed:', error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

if (require.main === module) {
  main();
}