import { ExerciseReferenceDetector } from './exercise-reference-detector.js';

async function main() {
  const detector = new ExerciseReferenceDetector();
  
  try {
    await detector.initialize();
    
    // Test with the example you provided
    const testExercise = {
      _id: 'test-123',
      name: 'Dirty Man Maker',
      description: `With a ruck, perform a man maker.

Burpee with squat thruster.

Except at bottom, 3 hand release merkins, at the top, 3 squat thrusters.

Do not warn PAX you plan to do these, as they may incite a mutiny.`,
      text: ''
    };
    
    console.log('🧪 TESTING EXERCISE REFERENCE DETECTION\n');
    console.log('Test Exercise:', testExercise.name);
    console.log('Description:', testExercise.description);
    console.log('\n🔍 Detecting references...\n');
    
    const result = await detector.detectReferences(testExercise);
    
    if (result) {
      console.log('✅ DETECTION RESULTS:');
      console.log(`Found ${result.references.length} references:\n`);
      
      result.references.forEach((ref, index) => {
        console.log(`${index + 1}. "${ref.text}"`);
        console.log(`   → References: ${ref.exerciseName}`);
        console.log(`   → Slug: ${ref.exerciseSlug}`);
        console.log(`   → Confidence: ${(ref.confidence * 100).toFixed(1)}%`);
        console.log(`   → Position: ${ref.startIndex}-${ref.endIndex}\n`);
      });
      
      console.log('📝 UPDATED TEXT WITH MARKDOWN REFERENCES:');
      console.log('=' + '='.repeat(50));
      console.log(result.updatedText);
      console.log('=' + '='.repeat(50));
      
      console.log(`\n📊 Overall confidence: ${(result.confidence * 100).toFixed(1)}%`);
    } else {
      console.log('❌ No references detected or error occurred');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await detector.cleanup();
  }
}

if (require.main === module) {
  main();
}