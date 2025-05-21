import { MongoClient, Collection } from 'mongodb';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { EnhancedExiconItem } from './types';
import { EnhancementResult } from './llmProcessor';

// Load environment variables
dotenv.config();

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'exicon';
const COLLECTION_NAME = 'exicon-items';

// File paths
const OUTPUT_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_INPUT_FILE = path.join(OUTPUT_DIR, 'all-exicon-items-batch-revised.json');

interface AliasObject {
  name: string;
  id?: string;
}

interface MongoExiconItem extends Omit<EnhancedExiconItem, 'aliases'>, EnhancementResult {
  _id: string; // Using external_id as _id
  createdAt: Date;
  updatedAt: Date;
  aliases: Array<{ name: string; id: string }>;
}

async function connectToMongo(): Promise<Collection<MongoExiconItem>> {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection<MongoExiconItem>(COLLECTION_NAME);
    
    // Create indexes (excluding _id which is automatically indexed)
    await collection.createIndex({ name: 'text', description: 'text', text: 'text' });
    await collection.createIndex({ categories: 1 });
    await collection.createIndex({ tags: 1 });
    
    return collection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

async function uploadToMongo(inputFilePath?: string): Promise<void> {
  const actualInputFile = inputFilePath || DEFAULT_INPUT_FILE;
  
  try {
    console.log('Starting uploadToMongo()');
    console.log(`Reading enhanced data from: ${actualInputFile}`);
    
    // Read the input JSON file
    const items: EnhancedExiconItem[] = await fs.readJSON(actualInputFile);
    console.log(`Found ${items.length} items to upload`);
    
    // Connect to MongoDB
    const collection = await connectToMongo();
    
    // Prepare items for MongoDB
    const now = new Date();
    const mongoItems: MongoExiconItem[] = items.map(item => {
      const enhancedItem = item as EnhancedExiconItem & EnhancementResult;
      return {
        ...item,
        _id: item.external_id,
        createdAt: now,
        updatedAt: now,
        aliases: enhancedItem.aliases.map(alias => {
          // Handle both string and object aliases
          if (typeof alias === 'string') {
            return {
              name: alias,
              id: alias.toLowerCase().replace(/\s+/g, '-')
            };
          }
          const aliasObj = alias as AliasObject;
          return {
            name: aliasObj.name,
            id: aliasObj.id || aliasObj.name.toLowerCase().replace(/\s+/g, '-')
          };
        }),
        tags: enhancedItem.tags || [],
        confidence: enhancedItem.confidence || 0,
        quality: enhancedItem.quality || 0,
        author: enhancedItem.author || 'N/A',
        difficulty: enhancedItem.difficulty || 0,
        time: enhancedItem.time || 1
      };
    });
    
    // Track statistics
    let upserted = 0;
    let errors = 0;
    
    // Process items in batches of 100
    const batchSize = 100;
    for (let i = 0; i < mongoItems.length; i += batchSize) {
      const batch = mongoItems.slice(i, i + batchSize);
      const operations = batch.map(item => ({
        updateOne: {
          filter: { _id: item._id },
          update: { 
            $set: {
              // Only update specific fields we want to maintain
              name: item.name,
              categories: item.categories,
              description: item.description,
              aliases: item.aliases,
              tags: item.tags,
              confidence: item.confidence,
              quality: item.quality,
              author: item.author,
              difficulty: item.difficulty,
              text: item.text,
              video_url: item.video_url,
              urlSlug: item.urlSlug,
              postURL: item.postURL,
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
    
  } catch (error) {
    console.error('Error in uploadToMongo:', error);
    throw error;
  }
}

// Execute the main function if this file is run directly
if (require.main === module) {
  uploadToMongo().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default uploadToMongo; 