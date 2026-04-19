const { MongoClient } = require('mongodb');
async function run() {
  const uri = 'mongodb+srv://kaushalgg678_db_user:Qwerty123@vi-sakha.1wqi6pv.mongodb.net/vinternship';
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('vinternship');
    // Remove the deviceType field from all records to revert the patch
    const result = await db.collection('conversations').updateMany(
      {},
      { $unset: { deviceType: "" } }
    );
    console.log(`Successfully reverted ${result.modifiedCount} conversation records.`);
  } catch (err) {
    console.error('Revert failed:', err);
  } finally {
    await client.close();
  }
}
run();
