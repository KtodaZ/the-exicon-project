import { ExerciseReferenceHybrid } from './exercise-reference-hybrid.js';
import { DatabaseManager } from './database.js';
import { loadProcessedIds, saveProcessedId } from './tracking.js';

async function main() {
  const hybrid = new ExerciseReferenceHybrid();
  const db = new DatabaseManager();

  try {
    await hybrid.initialize();
    await db.connect();

    console.log('🔗 BULK HYBRID TEXT FIELD REFERENCE PROCESSING');
    console.log('📊 Using AI detection + Search API validation + 80% similarity threshold');
    console.log('📝 Processing TEXT field specifically (not description)');
    console.log('⚠️  All validated references will be stored in the database!\n');

    // Load already processed exercise IDs for text processing
    const processedIds = await loadProcessedIds('hybrid-text-references');
    console.log(`📚 Found ${processedIds.length} already processed text fields`);

    let totalProcessed = 0;
    let totalWithReferences = 0;
    let totalReferences = 0;
    let totalValidated = 0;
    let batchNumber = 1;

    console.log('\n🔍 Processing text fields with hybrid approach...\n');

    while (true) {
      console.log(`\n--- BATCH ${batchNumber} ---`);

      // Get next batch of exercises that need text processing
      const exercises = await db.getExercisesForTextReferenceDetection(15, processedIds); // Smaller batches for AI calls

      if (exercises.length === 0) {
        console.log('🎉 All text fields processed with hybrid approach!');
        break;
      }

      console.log(`Processing ${exercises.length} text fields...`);

      let batchWithReferences = 0;
      let batchReferences = 0;
      let batchValidated = 0;

      for (const exercise of exercises) {
        try {
          console.log(`\n🔍 Processing text field: ${exercise.name}`);

          // Process the text field specifically
          const result = await hybrid.processExercise(exercise, 'text');

          if (result && result.references.length > 0) {
            console.log(`  ✅ Found ${result.references.length} validated references in text:`);
            result.references.forEach(ref => {
              console.log(`    - "${ref.originalText}" → ${ref.matchedExercise.name} (${(ref.similarity * 100).toFixed(1)}%)`);
            });

            // Extract just the urlSlugs for storage
            const referencedSlugs = result.references.map(ref => ref.slug);

            // Create proposal for text field update with markdown references
            await db.createExerciseReferenceProposal(
              exercise._id,
              referencedSlugs,
              result.updatedText, // Update text field with markdown references
              result.confidence,
              'text' // Specify that we're updating the text field
            );

            batchWithReferences++;
            batchReferences += result.references.length;
            batchValidated += result.references.length;
          } else {
            console.log(`  ⚪ No validated references found in text field`);

            // Still create proposal with empty array to track processing
            await db.createExerciseReferenceProposal(exercise._id, [], undefined, 1.0, 'text');
          }

          // Track as processed
          await saveProcessedId('hybrid-text-references', exercise._id);
          processedIds.push(exercise._id);

        } catch (error) {
          console.error(`❌ Error processing text field for ${exercise.name}:`, error);
        }

        // Small delay between exercises to be respectful to APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      totalProcessed += exercises.length;
      totalWithReferences += batchWithReferences;
      totalReferences += batchReferences;
      totalValidated += batchValidated;

      console.log(`\nBatch ${batchNumber} complete:`);
      console.log(`  📊 Processed: ${exercises.length}`);
      console.log(`  🔗 With references: ${batchWithReferences}`);
      console.log(`  📈 Total references: ${batchReferences}`);
      console.log(`\nRunning totals:`);
      console.log(`  📊 Total processed: ${totalProcessed}`);
      console.log(`  🔗 Total with references: ${totalWithReferences}`);
      console.log(`  📈 Total references found: ${totalReferences}`);
      console.log(`  ✅ Total validated: ${totalValidated}`);

      batchNumber++;

      // Longer delay between batches for AI rate limiting
      if (exercises.length > 0) {
        console.log('\nWaiting 5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`\n🎯 BULK TEXT FIELD PROCESSING COMPLETE!`);
    console.log(`📈 Total text fields processed: ${totalProcessed}`);
    console.log(`🔗 Text fields with references: ${totalWithReferences}`);
    console.log(`📊 Total references detected: ${totalReferences}`);
    console.log(`✅ Total validated through search API: ${totalValidated}`);
    console.log(`📋 All proposals saved for review and approval`);

    // Show some statistics
    if (totalWithReferences > 0) {
      console.log(`\n📊 STATISTICS:`);
      console.log(`  • Average references per text field with refs: ${(totalReferences / totalWithReferences).toFixed(1)}`);
      console.log(`  • Percentage of text fields with refs: ${((totalWithReferences / totalProcessed) * 100).toFixed(1)}%`);
      console.log(`  • Validation success rate: ${totalValidated > 0 ? ((totalValidated / totalValidated) * 100).toFixed(1) : 0}%`);
    }

    console.log(`\n🎉 SUCCESS! The hybrid approach for text fields combined:`);
    console.log(`  🤖 AI detection for finding potential exercise mentions`);
    console.log(`  🔍 Search API validation using your existing search logic`);
    console.log(`  📊 80% similarity threshold to prevent false matches`);
    console.log(`  📝 Specific processing of text field (not description)`);
    console.log(`  📋 Proposals saved for admin review and approval`);

  } catch (error) {
    console.error('Bulk text field processing failed:', error);
    process.exit(1);
  } finally {
    await hybrid.cleanup();
    await db.disconnect();
  }
}

if (require.main === module) {
  main();
} 