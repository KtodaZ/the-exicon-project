/**
 * Script to fix ObjectId format IDs in Better Auth collections
 * Run this script to convert any ObjectId format IDs to string format
 * 
 * Usage: node scripts/fix-auth-ids.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function fixAuthIds() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Checking and fixing auth collections...');
    
    // Collections to check
    const collections = ['user', 'session', 'account', 'verification'];
    
    for (const collectionName of collections) {
      console.log(`\n📋 Processing ${collectionName} collection...`);
      
      const collection = db.collection(collectionName);
      
      // Find documents with ObjectId format IDs
      const docs = await collection.find({
        $or: [
          { _id: { $type: 'objectId' } },
          { id: { $type: 'objectId' } },
          { userId: { $type: 'objectId' } },
          { sessionId: { $type: 'objectId' } }
        ]
      }).toArray();
      
      if (docs.length === 0) {
        console.log(`✅ No ObjectId format IDs found in ${collectionName}`);
        continue;
      }
      
      console.log(`⚠️  Found ${docs.length} documents with ObjectId format IDs in ${collectionName}`);
      
      // Process each document
      for (const doc of docs) {
        const updates = {};
        
        // Convert _id if it's ObjectId
        if (doc._id && ObjectId.isValid(doc._id) && typeof doc._id !== 'string') {
          updates.id = doc._id.toString();
        }
        
        // Convert other ID fields
        ['userId', 'sessionId', 'accountId'].forEach(field => {
          if (doc[field] && ObjectId.isValid(doc[field]) && typeof doc[field] !== 'string') {
            updates[field] = doc[field].toString();
          }
        });
        
        if (Object.keys(updates).length > 0) {
          console.log(`🔄 Updating document ${doc._id}...`);
          
          // Insert new document with string IDs
          const newDoc = { ...doc, ...updates };
          delete newDoc._id; // Remove old _id
          
          await collection.insertOne(newDoc);
          
          // Remove old document
          await collection.deleteOne({ _id: doc._id });
          
          console.log(`✅ Updated document successfully`);
        }
      }
    }
    
    console.log('\n🎉 Auth ID fixing completed!');
    
  } catch (error) {
    console.error('❌ Error fixing auth IDs:', error);
  } finally {
    await client.close();
  }
}

fixAuthIds().catch(console.error); 