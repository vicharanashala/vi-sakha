/**
 * Maintenance Script: Promote User to Admin
 * Usage: node scripts/promote-admin.js <email>
 */
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const email = process.argv[2];
if (!email) {
  console.error('Please provide an email address.');
  process.exit(1);
}

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI not found in .env');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db(); // Uses db name from URI or default
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase() },
      { $set: { role: 'admin' } }
    );

    if (result.matchedCount === 0) {
      console.log(`No user found with email: ${email}`);
    } else {
      console.log(`Successfully promoted ${email} to admin.`);
    }
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
