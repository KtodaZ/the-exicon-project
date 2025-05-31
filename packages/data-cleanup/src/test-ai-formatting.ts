import { DatabaseManager } from './database.js';
import { OpenAIClient } from './openai-client.js';

async function testFormatting() {
  const db = new DatabaseManager();
  const openai = new OpenAIClient();
  
  try {
    await db.connect();
    
    const lexiconCollection = db.getLexiconCollection();
    const item = await lexiconCollection.findOne({ title: 'Fraziered' });
    
    if (!item) {
      console.log('❌ Fraziered not found');
      return;
    }
    
    console.log('📝 Current Fraziered description:');
    console.log(`"${item.description}"`);
    console.log(`\nLength: ${item.description.length} chars\n`);
    
    // Test AI formatting
    const result = await openai.generateLexiconFormatting(item);
    console.log('🤖 AI Proposed formatting:');
    console.log(`"${result.formattedText}"`);
    
    // Compare
    const cleanForComparison = (text: string) => text
      .replace(/\s+/g, ' ')
      .trim();
    
    const cleanedCurrent = cleanForComparison(item.description);
    const cleanedProposed = cleanForComparison(result.formattedText);
    
    console.log('\n🔍 Comparison:');
    console.log(`Current (cleaned): "${cleanedCurrent}"`);
    console.log(`Proposed (cleaned): "${cleanedProposed}"`);
    console.log(`Content same: ${cleanedCurrent === cleanedProposed}`);
    console.log(`Formatting same: ${item.description === result.formattedText}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.disconnect();
  }
}

testFormatting(); 