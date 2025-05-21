import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { SimplifiedExiconItem } from './types';
import enhanceExiconDataBatch from './enhanceBatchExicon';

// Load environment variables
dotenv.config();

// File paths
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');
const INPUT_FILE = path.join(OUTPUT_DIR, 'all-exicon-items.json');
const TEST_FILE = path.join(OUTPUT_DIR, 'batch-test-items.json');

// Create a test file with a small batch of items
async function createTestFile() {
  try {
    console.log('Creating test file with a batch of items');
    
    // Read the input JSON file
    const items: SimplifiedExiconItem[] = await fs.readJSON(INPUT_FILE);
    console.log(`Found ${items.length} total items`);
    
    // Select items containing "windmill" in name or text
    const testItems = items.filter(item => 
      item.name.toLowerCase().includes('carolina') || 
      item.text.toLowerCase().includes('carolina') ||
        item.name.toLowerCase().includes('merkin') ||
        item.text.toLowerCase().includes('merkin')
    );
    
    // Save the test items
    await fs.writeJSON(TEST_FILE, testItems, { spaces: 2 });
    
    console.log(`Created test file with ${testItems.length} items at: ${TEST_FILE}`);
    return testItems.length;
  } catch (error) {
    console.error('Error creating test file:', error);
    return 0;
  }
}

// Run the batch test
async function runBatchTest() {
  // First create the test file
  const itemCount = await createTestFile();
  
  if (itemCount === 0) {
    console.error('Failed to create test file, aborting test');
    return;
  }
  
  // Then run the batch enhancer with the test file
  // Use a small batch size that's less than the total test items
  // This will test multiple batches
  const batchSize = 10000; // Process 5 items per batch
  console.log(`Running batch enhancer with batches of ${batchSize} items`);
  
  await enhanceExiconDataBatch(TEST_FILE, batchSize);
}

// Execute the test if this file is run directly
if (require.main === module) {
  runBatchTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default runBatchTest; 