import { DatabaseManager } from './database.js';
import { LexiconItem } from './types.js';

export class LexiconSmartLineBreakFixer {
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
    console.log('Smart lexicon line break fixer initialized');
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  async findProblematicItems(): Promise<void> {
    const lexiconCollection = this.db.getLexiconCollection();
    
    // Find items that might need better formatting
    const items = await lexiconCollection.find({
      $or: [
        // Items with very long single lines (likely need strategic breaks)
        { description: { $regex: '^[^\n]{150,}$' } },
        // Items with awkward line breaks in mid-sentence
        { description: { $regex: '\\w\\s*\\n\\s*[a-z]' } }
      ]
    }).limit(20).toArray();

    console.log(`\n🔍 Found ${items.length} lexicon items that might need formatting improvements:\n`);
    
    for (const item of items) {
      console.log(`📝 ${item.title}:`);
      console.log(`Current (${item.description.length} chars):`);
      console.log(`"${item.description}"`);
      
      // Show the improved version
      const improved = this.improveLineBreaks(item.description);
      if (improved !== item.description) {
        console.log(`\nImproved version:`);
        console.log(`"${improved}"`);
        console.log(`\n${'-'.repeat(80)}\n`);
      } else {
        console.log(`(No changes needed)\n${'-'.repeat(80)}\n`);
      }
    }
  }

  async fixAllLineBreaks(): Promise<void> {
    const lexiconCollection = this.db.getLexiconCollection();
    
    // Get all lexicon items to review
    const items = await lexiconCollection.find({}).toArray();

    console.log(`\n🔧 Reviewing ${items.length} lexicon items for smart formatting improvements...\n`);
    
    let fixedCount = 0;
    
    for (const item of items) {
      const originalDescription = item.description;
      const improvedDescription = this.improveLineBreaks(originalDescription);
      
      if (improvedDescription !== originalDescription) {
        console.log(`✏️  Improving: ${item.title}`);
        
        await lexiconCollection.updateOne(
          { _id: item._id },
          {
            $set: {
              description: improvedDescription,
              updatedAt: new Date()
            }
          }
        );
        
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Improved formatting for ${fixedCount} lexicon items`);
  }

  private improveLineBreaks(text: string): string {
    // More intelligent line break handling
    
    // Step 1: Normalize and clean up existing breaks
    let improved = text
      // Normalize multiple line breaks to double line breaks (paragraph breaks)
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Clean up excessive whitespace
      .replace(/[ \t]+/g, ' ')
      .trim();

    // Step 2: Fix obvious mid-sentence breaks (lowercase word after break)
    improved = improved.replace(/(?<=\w)\s*\n\s*(?=[a-z])/g, ' ');

    // Step 3: Fix breaks that split obvious phrases
    improved = improved
      // Fix breaks before common connecting words
      .replace(/\s*\n\s*(?=(and|or|but|with|for|to|in|of|at|on|by|from|that|which|who|when|where|while|because|although|however|therefore|thus|also|additionally|furthermore|moreover)\s)/gi, ' ')
      // Fix breaks in the middle of common F3 terms
      .replace(/\s*\n\s*(?=(man|men|pax|beatdown|workout|exercise|circle|trust|leadership|commitment)\s)/gi, ' ');

    // Step 4: Add strategic breaks for very long sentences (150+ chars with no breaks)
    if (improved.length > 150 && !improved.includes('\n')) {
      improved = this.addStrategicBreaks(improved);
    }

    // Step 5: Final cleanup
    improved = improved
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .trim();

    return improved;
  }

  private addStrategicBreaks(text: string): string {
    // Add strategic line breaks for readability in long sentences
    // Look for natural break points: after commas, before certain connecting words, etc.
    
    let result = text;
    
    // If it's a really long sentence, add breaks after certain patterns
    if (text.length > 200) {
      result = result
        // Break after commas followed by longer clauses
        .replace(/, ((?:in order to|with the purpose of|that|which|who|when|where|while|because|although).{20,})/gi, ',\n$1')
        // Break before "in order to" if it's mid-sentence
        .replace(/(\w+)\s+(in order to)/gi, '$1\n$2')
        // Break before "with the purpose of"
        .replace(/(\w+)\s+(with the purpose of)/gi, '$1\n$2');
    }
    
    return result;
  }
}

async function main() {
  const fixer = new LexiconSmartLineBreakFixer();
  
  try {
    await fixer.initialize();
    
    console.log('🔍 FINDING items that need smart formatting improvements...');
    await fixer.findProblematicItems();
    
    console.log('\n🤔 Review the proposed changes above. Run with --fix to apply improvements.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await fixer.cleanup();
  }
}

async function fix() {
  const fixer = new LexiconSmartLineBreakFixer();
  
  try {
    await fixer.initialize();
    
    console.log('🔧 APPLYING smart formatting improvements...');
    await fixer.fixAllLineBreaks();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await fixer.cleanup();
  }
}

// Check command line args
const shouldFix = process.argv.includes('--fix');

if (shouldFix) {
  fix().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} else {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 