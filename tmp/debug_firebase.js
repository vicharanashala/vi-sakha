const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the root
dotenv.config({ path: path.join(__dirname, '../.env') });

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
console.log('Firebase Service Account String length:', serviceAccountStr ? serviceAccountStr.length : 0);

if (!serviceAccountStr) {
  console.error('FIREBASE_SERVICE_ACCOUNT not found in .env');
  process.exit(1);
}

try {
  // Try to clean and parse
  const cleanJson = serviceAccountStr.trim().replace(/^'|'$/g, '');
  const serviceAccount = JSON.parse(cleanJson);
  console.log('Parsed Project ID:', serviceAccount.project_id);
  console.log('Parsed Private Key starts with:', serviceAccount.private_key.substring(0, 30));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK Initialized successfully in debug script');

  // Test an auth operation
  admin.auth().listUsers(1)
    .then(() => {
      console.log('SUCCESS: Was able to fetch users!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('FAILURE during listUsers:', err.message);
      process.exit(1);
    });
} catch (error) {
  console.error('Parsing error:', error.message);
  process.exit(1);
}
