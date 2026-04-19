const { MongoClient } = require('mongodb');
async function run() {
  const uri = 'mongodb+srv://kaushalgg678_db_user:Qwerty123@vi-sakha.1wqi6pv.mongodb.net/vinternship';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('vinternship');
    // Randomly assign mobile/desktop to records that don't have it
    const result = await db.collection('conversations').updateMany(
      { deviceType: { $exists: false } },
      [
        {
          $set: {
            deviceType: {
              $cond: [
                { $lt: [{ $rand: {} }, 0.4] },
                'mobile',
                'desktop'
              ]
            }
          }
        }
      ]
    );
    console.log(`Successfully patched ${result.modifiedCount} conversation records.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.close();
  }
}
run();
