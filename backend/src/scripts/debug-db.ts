import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to:', process.env.MONGODB_URI?.split('@')[1]); // Log host only for privacy
  
  if (!mongoose.connection.db) {
    console.error('Database connection not established.');
    return;
  }
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map(c => c.name);
  console.log('Available Collections:', names);

  // Check the two likely suspects
  for (const collName of ['apikeys', 'api_keys']) {
    if (names.includes(collName)) {
      const count = await mongoose.connection.db.collection(collName).countDocuments();
      console.log(`- Collection [${collName}] has ${count} documents`);
      
      if (count > 0) {
        const latest = await mongoose.connection.db.collection(collName).find().sort({ createdAt: -1 }).limit(1).toArray();
        console.log(`  Latest key last4: ${latest[0].last4}, isActive: ${latest[0].isActive}`);
      }
    }
  }

  await mongoose.disconnect();
}

debug();
