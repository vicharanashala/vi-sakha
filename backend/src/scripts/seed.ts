/**
 * Seed Script - Import QA Pairs and Embeddings to MongoDB
 *
 * This script reads from:
 * - ../bot/data/qa_dataset.json (QA pairs)
 * - ../bot/data/embeddings.json (optional, if exported from ChromaDB)
 *
 * Usage:
 *   cd backend
 *   npm run seed
 *
 * Or with ts-node:
 *   npx ts-node src/scripts/seed.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import mongoose from 'mongoose';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Paths
const PROJECT_ROOT = path.join(__dirname, '../../..');
const QA_DATASET_PATH = path.join(PROJECT_ROOT, 'bot/data/qa_dataset.json');
const EMBEDDINGS_PATH = path.join(PROJECT_ROOT, 'bot/data/embeddings.json');

// MongoDB schemas (simplified for script)
const qaPairSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    source: { type: String, default: 'unknown' },
  },
  { timestamps: true, collection: 'qa_pairs' },
);

const embeddingSchema = new mongoose.Schema(
  {
    qa_pair_id: { type: String, required: true },
    embedding: { type: [Number], required: true },
    question: String,
    source: { type: String, default: 'unknown' },
    dimensions: Number,
  },
  { timestamps: true, collection: 'embeddings' },
);

const metadataSchema = new mongoose.Schema(
  {
    qa_pairs_count: Number,
    embeddings_count: Number,
    embedding_dimensions: Number,
    embedding_model: String,
    llm_model: String,
    last_updated: Date,
    version: String,
  },
  { collection: 'metadata' },
);

interface QaPairData {
  question: string;
  answer: string;
  source?: string;
}

interface EmbeddingData {
  id: string;
  embedding: number[];
  question?: string;
  source?: string;
}

async function loadQaDataset(): Promise<QaPairData[]> {
  console.log(`\n📂 Loading QA dataset from: ${QA_DATASET_PATH}`);

  if (!fs.existsSync(QA_DATASET_PATH)) {
    throw new Error(`QA dataset not found: ${QA_DATASET_PATH}`);
  }

  const data = JSON.parse(fs.readFileSync(QA_DATASET_PATH, 'utf-8'));
  console.log(`✓ Loaded ${data.length} QA pairs`);
  return data;
}

async function loadEmbeddings(): Promise<EmbeddingData[] | null> {
  console.log(`\n📂 Loading embeddings from: ${EMBEDDINGS_PATH}`);

  if (!fs.existsSync(EMBEDDINGS_PATH)) {
    console.log(
      '⚠ Embeddings file not found. Run export_embeddings.py first.',
    );
    console.log('  Continuing without embeddings...');
    return null;
  }

  const data = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, 'utf-8'));
  console.log(`✓ Loaded ${data.length} embeddings`);
  return data;
}

async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vinternship';
  console.log(`\n🔌 Connecting to MongoDB: ${uri}`);

  try {
    await mongoose.connect(uri);
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    throw error;
  }
}

async function seedQaPairs(qaData: QaPairData[]): Promise<void> {
  console.log('\n📝 Seeding QA pairs...');

  const QaPair = mongoose.model('QaPair', qaPairSchema);

  // Clear existing
  await QaPair.deleteMany({});
  console.log('  Cleared existing QA pairs');

  // Insert new
  const docs = qaData.map((item, index) => ({
    _id: new mongoose.Types.ObjectId(),
    question: item.question,
    answer: item.answer,
    source: item.source || 'unknown',
  }));

  await QaPair.insertMany(docs);
  console.log(`✓ Inserted ${docs.length} QA pairs`);

  // Create indexes
  await QaPair.collection.createIndex({ question: 'text', answer: 'text' });
  await QaPair.collection.createIndex({ source: 1 });
  console.log('✓ Created indexes');
}

async function seedEmbeddings(
  embeddingsData: EmbeddingData[],
  qaData: QaPairData[],
): Promise<void> {
  console.log('\n📝 Seeding embeddings...');

  const Embedding = mongoose.model('Embedding', embeddingSchema);

  // Clear existing
  await Embedding.deleteMany({});
  console.log('  Cleared existing embeddings');

  // Insert new
  const docs = embeddingsData.map((item, index) => {
    const qaIndex = parseInt(item.id, 10);
    const qa = qaData[qaIndex] || {};

    return {
      _id: new mongoose.Types.ObjectId(),
      qa_pair_id: item.id,
      embedding: item.embedding,
      question: item.question || qa.question || '',
      source: item.source || qa.source || 'unknown',
      dimensions: item.embedding.length,
    };
  });

  await Embedding.insertMany(docs);
  console.log(`✓ Inserted ${docs.length} embeddings`);
  console.log(`  Embedding dimensions: ${docs[0]?.dimensions || 'N/A'}`);

  // Create indexes
  await Embedding.collection.createIndex({ qa_pair_id: 1 });
  await Embedding.collection.createIndex({ source: 1 });
  console.log('✓ Created indexes');
}

async function seedMetadata(
  qaCount: number,
  embeddingsCount: number,
  dimensions: number,
): Promise<void> {
  console.log('\n📝 Seeding metadata...');

  const Metadata = mongoose.model('Metadata', metadataSchema);

  await Metadata.deleteMany({});

  await Metadata.create({
    _id: new mongoose.Types.ObjectId(),
    qa_pairs_count: qaCount,
    embeddings_count: embeddingsCount,
    embedding_dimensions: dimensions,
    embedding_model: 'BAAI/bge-large-en-v1.5',
    llm_model: 'claude-haiku-4-5-20251001',
    last_updated: new Date(),
    version: '1.0.0',
  });

  console.log('✓ Metadata saved');
}

async function main(): Promise<void> {
  console.log('═'.repeat(60));
  console.log('  Vinternship Backend - Database Seed Script');
  console.log('═'.repeat(60));

  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Load data
    const qaData = await loadQaDataset();
    const embeddingsData = await loadEmbeddings();

    // Seed QA pairs
    await seedQaPairs(qaData);

    // Seed embeddings if available
    if (embeddingsData) {
      await seedEmbeddings(embeddingsData, qaData);
    }

    // Seed metadata
    await seedMetadata(
      qaData.length,
      embeddingsData?.length || 0,
      embeddingsData?.[0]?.embedding.length || 0,
    );

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('  ✓ Seed Complete!');
    console.log('═'.repeat(60));
    console.log(`  QA Pairs: ${qaData.length}`);
    console.log(`  Embeddings: ${embeddingsData?.length || 0}`);
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('\n✗ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

main();
