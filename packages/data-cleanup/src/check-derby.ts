import { DatabaseManager } from './database.js';

async function checkDerby() {
  const db = new DatabaseManager();
  
  try {
    await db.connect();
    
    const lexiconCollection = db.getLexiconCollection();
    const derby = await lexiconCollection.findOne({ title: 'DERBY (THE)' });
    
    if (derby) {
      console.log('📝 DERBY (THE) - Current description:');
      console.log(`"${derby.description}"`);
    } else {
      console.log('❌ DERBY (THE) not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.disconnect();
  }
}

checkDerby(); 