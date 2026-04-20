import * as mongoose from 'mongoose';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 1. Setup Environment
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// 2. Encryption Constants (Must match backend exactly)
const ALGORITHM = 'aes-256-cbc';
const RAW_SECRET = process.env.API_KEY_SECRET || 'default-secret-not-for-production-use-32-chars';
const SECRET_KEY = crypto.createHash('sha256').update(RAW_SECRET).digest();

async function run() {
  console.log('----------------------------------------------------');
  console.log('🚀 VSAKHA - Final Fix: API Key Generator');
  console.log('----------------------------------------------------');

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // MATE: We discovered the NestJS app uses the "apikeys" collection (no underscore)
    // while our previous script accidentally used "api_keys".
    const COLLECTION_NAME = 'apikeys';

    const ApiKeySchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: String,
      keyHash: { type: String, unique: true },
      encryptedKey: String,
      iv: String,
      last4: String,
      expiresAt: Date,
      isActive: { type: Boolean, default: true }
    }, { collection: COLLECTION_NAME, timestamps: true });

    const UserSchema = new mongoose.Schema({
      email: String,
      role: String,
      name: String
    }, { collection: 'users' });

    const ApiKey = mongoose.model('ApiKey', ApiKeySchema);
    const User = mongoose.model('User', UserSchema);

    // 1. Find an Admin or Lab Member
    const user = await User.findOne({ 
      $or: [{ role: 'admin' }, { role: 'lab_member' }] 
    });

    if (!user) {
      console.error('❌ No Admin or LabMember user found in database.');
      return;
    }

    console.log(`👤 Using User: ${user.name} (${user.email}) [${user.role}]`);

    // 2. Generate Credentials
    const entropy = crypto.randomBytes(32).toString('hex');
    const rawKey = `vsakha_live_${entropy}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const last4 = rawKey.slice(-4);

    // 3. Encrypt for Storage
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(rawKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 4. Set Expiry (30 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 5. Save to Database (Targeting the correct collection)
    await ApiKey.create({
      userId: user._id,
      name: 'Functional Testing Key (Corrected)',
      keyHash: hash,
      encryptedKey: encrypted,
      iv: iv.toString('hex'),
      last4,
      expiresAt,
      isActive: true
    });

    console.log('\n🌟 SUCCESS: API Key stored in "apikeys" collection!');
    console.log('----------------------------------------------------');
    console.log(`KEY: ${rawKey}`);
    console.log(`EXPIRES: ${expiresAt.toLocaleDateString()}`);
    console.log('----------------------------------------------------');
    console.log('\nTo run your tests:');
    console.log(`$env:VSAKHA_TEST_API_KEY="${rawKey}"; pytest backend/tests/test_mcp.py`);
    console.log('----------------------------------------------------');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
