import { MongoClient, Collection } from 'mongodb';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { SimplifiedLexiconItem, MongoLexiconItem } from './types';

// Load environment variables
dotenv.config();

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'exicon';
const COLLECTION_NAME = 'lexicon';

// File paths
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_INPUT_FILE = path.join(OUTPUT_DIR, 'lexicon-items.json');

async function connectToMongo(): Promise<Collection<MongoLexiconItem>> {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoLexiconItem>(COLLECTION_NAME);
    
    // Create indexes for better search performance
    await collection.createIndex({ title: 'text', description: 'text' });
    await collection.createIndex({ urlSlug: 1 });
    await collection.createIndex({ title: 1 });
    
    return collection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

async function uploadLexiconToMongo(inputFilePath?: string): Promise<void> {
  const actualInputFile = inputFilePath || DEFAULT_INPUT_FILE;
  
  try {
    console.log('Starting uploadLexiconToMongo()');
    console.log(`Reading lexicon data from: ${actualInputFile}`);
    
    // Read the input JSON file
    const items: SimplifiedLexiconItem[] = await fs.readJSON(actualInputFile);
    console.log(`Found ${items.length} lexicon items to upload`);
    
    // Connect to MongoDB
    const collection = await connectToMongo();
    
    // Prepare items for MongoDB
    const now = new Date();
    const mongoItems: MongoLexiconItem[] = items.map((item: SimplifiedLexiconItem) => ({
      _id: item._id,
      title: item.title,
      description: item.description,
      urlSlug: item.urlSlug,
      rawHTML: item.rawHTML,
      createdAt: now,
      updatedAt: now
    }));
    
    // Track statistics
    let upserted = 0;
    let errors = 0;
    
    // Process items in batches of 100
    const batchSize = 100;
    for (let i = 0; i < mongoItems.length; i += batchSize) {
      const batch = mongoItems.slice(i, i + batchSize);
      const operations = batch.map((item: MongoLexiconItem) => ({
        updateOne: {
          filter: { _id: item._id },
          update: { 
            $set: {
              title: item.title,
              description: item.description,
              urlSlug: item.urlSlug,
              rawHTML: item.rawHTML,
              updatedAt: now
            },
            $setOnInsert: {
              _id: item._id,
              createdAt: now
            }
          },
          upsert: true
        }
      }));
      
      try {
        const result = await collection.bulkWrite(operations);
        upserted += result.upsertedCount || 0;
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mongoItems.length / batchSize)}`);
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        errors++;
      }
    }
    
    console.log('\nUpload completed!');
    console.log(`Total items processed: ${mongoItems.length}`);
    console.log(`Items upserted: ${upserted}`);
    console.log(`Errors encountered: ${errors}`);
    
    // Display some sample items that were uploaded
    console.log('\nSample uploaded items:');
    const sampleItems = await collection.find({}).limit(3).toArray();
    sampleItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
      console.log(`   Description: ${item.description.substring(0, 100)}${item.description.length > 100 ? '...' : ''}`);
      console.log(`   URL Slug: ${item.urlSlug}`);
      console.log(`   Has Raw HTML: ${item.rawHTML ? 'Yes' : 'No'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error in uploadLexiconToMongo:', error);
    throw error;
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  uploadLexiconToMongo().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default uploadLexiconToMongo; 