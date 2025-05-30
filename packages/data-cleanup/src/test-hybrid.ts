import { ExerciseReferenceHybrid } from './exercise-reference-hybrid.js';

async function main() {
  const hybrid = new ExerciseReferenceHybrid();
  
  try {
    await hybrid.initialize();
    
    console.log('🧪 TESTING HYBRID AI + SEARCH API APPROACH\n');
    
    // Test cases from your examples
    const testCases = [
      {
        name: 'Dirty Man Maker',
        description: `With a ruck, perform a man maker.

Burpee with squat thruster.

Except at bottom, 3 hand release merkins, at the top, 3 squat thrusters.

Do not warn PAX you plan to do these, as they may incite a mutiny.`,
        expectedMatches: ['man maker', 'burpee', 'squat thruster', 'hand release merkins']
      },
      {
        name: 'Ruskie Burpee',
        description: `Burpee variation in honor of the Ruskie (Yuri Verkhoshansky), who developed plyometrics to train Olympians:

The merkin at the bottom of the burpee is a clap-merkin, and on the up portion, there are two tuck jumps per burpee.

Basically, it s a Clurpee with two tuck jumps.`,
        expectedMatches: ['burpee', 'merkin', 'clap-merkin', 'tuck jumps', 'clurpee']
      },
      {
        name: 'Sand Murder Bunnies',
        description: 'Murder Bunnies performed in the sand (ie - a volleyball court, playground area, beach, etc)',
        expectedMatches: ['murder bunnies']
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${'='.repeat(70)}`);
      console.log(`TEST CASE ${i + 1}: ${testCase.name}`);
      console.log(`${'='.repeat(70)}`);
      console.log(`Description: ${testCase.description}\n`);
      console.log(`Expected matches: ${testCase.expectedMatches.join(', ')}\n`);
      
      const testExercise = {
        _id: `test-${i + 1}`,
        name: testCase.name,
        description: testCase.description,
        text: ''
      };
      
      const result = await hybrid.processExercise(testExercise);
      
      if (result && result.references.length > 0) {
        console.log(`\n✅ FOUND ${result.references.length} VALIDATED REFERENCES:`);
        result.references.forEach((ref, index) => {
          console.log(`  ${index + 1}. AI found: "${ref.originalText}"`);
          console.log(`     Search matched: "${ref.matchedExercise.name}"`);
          console.log(`     Similarity: ${(ref.similarity * 100).toFixed(1)}%`);
          console.log(`     Slug: @${ref.slug}`);
          console.log(`     Position: ${ref.startIndex}-${ref.endIndex}\n`);
        });
        
        console.log('📝 UPDATED TEXT WITH MARKDOWN:');
        console.log('-'.repeat(60));
        console.log(result.updatedText);
        console.log('-'.repeat(60));
        
        console.log(`\n📊 Overall confidence: ${(result.confidence * 100).toFixed(1)}%`);
        
        // Check accuracy against expected matches
        const foundTexts = result.references.map(r => r.originalText.toLowerCase());
        const expectedTexts = testCase.expectedMatches.map(e => e.toLowerCase());
        const matchedExpected = expectedTexts.filter(expected => 
          foundTexts.some(found => found.includes(expected) || expected.includes(found))
        );
        
        console.log(`\n🎯 ACCURACY: Found ${matchedExpected.length}/${expectedTexts.length} expected matches`);
        if (matchedExpected.length < expectedTexts.length) {
          const missed = expectedTexts.filter(expected => 
            !foundTexts.some(found => found.includes(expected) || expected.includes(found))
          );
          console.log(`   Missed: ${missed.join(', ')}`);
        }
        
      } else {
        console.log('\n❌ No validated references found');
        console.log(`   Expected: ${testCase.expectedMatches.join(', ')}`);
      }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log('HYBRID TESTING COMPLETE');
    console.log('This approach uses:');
    console.log('  1. 🤖 AI to detect potential exercise mentions');
    console.log('  2. 🔍 Search API to find matching exercises');
    console.log('  3. 📊 80% similarity threshold to validate matches');
    console.log(`${'='.repeat(70)}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await hybrid.cleanup();
  }
}

if (require.main === module) {
  main();
}