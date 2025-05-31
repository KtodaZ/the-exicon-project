import { DatabaseManager } from './database.js';
import { LexiconItem } from './types.js';

export class LexiconLineBreakFixer {
  private db: DatabaseManager;

  constructor() {
    this.db = new DatabaseManager();
  }

  async initialize(): Promise<void> {
    await this.db.connect();
    console.log('Lexicon line break fixer initialized');
  }

  async cleanup(): Promise<void> {
    await this.db.disconnect();
  }

  async findProblematicItems(): Promise<void> {
    const lexiconCollection = this.db.getLexiconCollection();
    
    // Find items with line breaks that might be problematic
    const items = await lexiconCollection.find({
      description: { 
        $regex: '\\n(?!\\n).*\\s+\\n(?!\\n)', // Line breaks that aren't paragraph breaks
        $options: 'i'
      }
    }).limit(20).toArray();

    console.log(`\n🔍 Found ${items.length} lexicon items with potential line break issues:\n`);
    
    for (const item of items) {
      console.log(`📝 ${item.title}:`);
      console.log(`Current description:`);
      console.log(`"${item.description}"`);
      
      // Show the fixed version
      const fixed = this.fixLineBreaks(item.description);
      if (fixed !== item.description) {
        console.log(`\nFixed version:`);
        console.log(`"${fixed}"`);
        console.log(`\n${'-'.repeat(80)}\n`);
      } else {
        console.log(`(No changes needed)\n${'-'.repeat(80)}\n`);
      }
    }
  }

  async fixAllLineBreaks(): Promise<void> {
    const lexiconCollection = this.db.getLexiconCollection();
    
    // Find items with line breaks that might be problematic
    const items = await lexiconCollection.find({
      description: { 
        $regex: '\\n(?!\\n)', // Any single line breaks (not paragraph breaks)
        $options: 'i'
      }
    }).toArray();

    console.log(`\n🔧 Found ${items.length} lexicon items with line breaks to fix:\n`);
    
    let fixedCount = 0;
    
    for (const item of items) {
      const originalDescription = item.description;
      const fixedDescription = this.fixLineBreaks(originalDescription);
      
      if (fixedDescription !== originalDescription) {
        console.log(`✏️  Fixing: ${item.title}`);
        
        await lexiconCollection.updateOne(
          { _id: item._id },
          {
            $set: {
              description: fixedDescription,
              updatedAt: new Date()
            }
          }
        );
        
        fixedCount++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} lexicon items with inappropriate line breaks`);
  }

  private fixLineBreaks(text: string): string {
    // Remove single line breaks that appear to be in the middle of sentences
    // Keep double line breaks (paragraph breaks)
    
    return text
      // First, normalize multiple line breaks to double line breaks
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // Remove single line breaks that are followed by lowercase words (likely mid-sentence)
      .replace(/\n(?=\s*[a-z])/g, ' ')
      // Remove single line breaks that are preceded by text and followed by text (likely mid-sentence)
      .replace(/(?<=\w)\s*\n\s*(?=\w)/g, ' ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Clean up space before punctuation
      .replace(/\s+([,.;:!?])/g, '$1')
      // Trim
      .trim();
  }
}

async function main() {
  const fixer = new LexiconLineBreakFixer();
  
  try {
    await fixer.initialize();
    
    console.log('🔍 FINDING problematic line breaks first...');
    await fixer.findProblematicItems();
    
    console.log('\n🤔 Do you want to fix all these items? (Run the fix manually with --fix flag)');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await fixer.cleanup();
  }
}

async function fix() {
  const fixer = new LexiconLineBreakFixer();
  
  try {
    await fixer.initialize();
    
    console.log('🔧 FIXING all inappropriate line breaks...');
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