import { ExerciseReferenceDetector } from './exercise-reference-detector.js';
import { DatabaseManager } from './database.js';
import { loadProcessedIds, saveProcessedId } from './tracking.js';

async function main() {
  const detector = new ExerciseReferenceDetector();
  const db = new DatabaseManager();
  
  try {
    await detector.initialize();
    
    console.log('🔗 BULK EXERCISE REFERENCE DETECTION');
    console.log('📊 Processing exercises to detect references to other exercises');
    console.log('⚠️  All detected references will be stored in the database!\n');
    
    // First, generate and store slugs for all exercises
    console.log('🏷️  Step 1: Generating slugs for all exercises...');
    await db.generateAndStoreSlugs();
    
    // Load already processed exercise IDs
    const processedIds = await loadProcessedIds('reference-detection');
    console.log(`📚 Found ${processedIds.length} already processed exercises`);
    
    let totalProcessed = 0;
    let totalWithReferences = 0;
    let totalReferences = 0;
    let batchNumber = 1;
    
    console.log('\n🔍 Step 2: Detecting exercise references...\n');
    
    while (true) {
      console.log(`\n--- BATCH ${batchNumber} ---`);
      
      // Get next batch of exercises that need processing
      const exercises = await db.getExercisesForReferenceDetection(30, processedIds);
      
      if (exercises.length === 0) {
        console.log('🎉 All exercises processed for reference detection!');
        break;
      }
      
      console.log(`Processing ${exercises.length} exercises...`);
      
      let batchWithReferences = 0;
      let batchReferences = 0;
      
      for (const exercise of exercises) {
        try {
          console.log(`🔍 Analyzing: ${exercise.name}`);
          
          const result = await detector.detectReferences(exercise);
          
          if (result && result.references.length > 0) {
            console.log(`  ✅ Found ${result.references.length} references:`);
            result.references.forEach(ref => {
              console.log(`    - "${ref.text}" → ${ref.exerciseName} (${ref.confidence.toFixed(2)})`);
            });
            
            // Extract just the slugs for storage
            const referencedSlugs = result.references.map(ref => ref.exerciseSlug);
            
            // Update the exercise in the database
            await db.updateExerciseReferences(
              exercise._id, 
              referencedSlugs, 
              result.updatedText
            );
            
            batchWithReferences++;
            batchReferences += result.references.length;
          } else {
            console.log(`  ⚪ No references found`);
            
            // Still mark as processed with empty array
            await db.updateExerciseReferences(exercise._id, []);
          }
          
          // Track as processed
          await saveProcessedId('reference-detection', exercise._id);
          processedIds.push(exercise._id);
          
        } catch (error) {
          console.error(`❌ Error processing ${exercise.name}:`, error);
        }
      }
      
      totalProcessed += exercises.length;
      totalWithReferences += batchWithReferences;
      totalReferences += batchReferences;
      
      console.log(`\nBatch ${batchNumber} complete:`);
      console.log(`  📊 Processed: ${exercises.length}`);
      console.log(`  🔗 With references: ${batchWithReferences}`);
      console.log(`  📈 Total references: ${batchReferences}`);
      console.log(`\nRunning totals:`);
      console.log(`  📊 Total processed: ${totalProcessed}`);
      console.log(`  🔗 Total with references: ${totalWithReferences}`);
      console.log(`  📈 Total references found: ${totalReferences}`);
      
      batchNumber++;
      
      // Rate limiting between batches
      if (exercises.length > 0) {
        console.log('\nWaiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log('\n🔄 Step 3: Updating reverse references (referencedBy fields)...');
    await db.updateReferencedByFields();
    
    console.log(`\n🎯 BULK REFERENCE DETECTION COMPLETE!`);
    console.log(`📈 Total exercises processed: ${totalProcessed}`);
    console.log(`🔗 Exercises with references: ${totalWithReferences}`);
    console.log(`📊 Total references detected: ${totalReferences}`);
    console.log(`🗄️ All reference data stored in MongoDB`);
    
    // Show some statistics
    if (totalWithReferences > 0) {
      console.log(`\n📊 STATISTICS:`);
      console.log(`  • Average references per exercise with refs: ${(totalReferences / totalWithReferences).toFixed(1)}`);
      console.log(`  • Percentage of exercises with references: ${((totalWithReferences / totalProcessed) * 100).toFixed(1)}%`);
    }
    
  } catch (error) {
    console.error('Bulk reference detection failed:', error);
    process.exit(1);
  } finally {
    await detector.cleanup();
  }
}

if (require.main === module) {
  main();
}