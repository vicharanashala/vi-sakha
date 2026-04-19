import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adityabmv-se-prj';
const TARGET_DIR = path.join(process.cwd(), '..', 'bot', 'scraped_transcripts');

// Define Mongoose Schema for discord_conversations
const DiscordMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'system', 'agent'], required: true },
  type: { type: String, enum: ['message', 'ticket_reason', 'image_url'], default: 'message' },
  text: { type: String, required: true },
  attachments: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now },
  authorId: { type: String },
  authorName: { type: String },
}, { _id: false });

const DiscordConversationSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true },
  discordChannelId: { type: String, required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  source: { type: String, enum: ['discord_live', 'discord_transcript'], default: 'discord_live' },
  messages: { type: [DiscordMessageSchema], default: [] },
  transcriptProcessed: { type: Boolean, default: false },
  ticketOwnerId: String,
  ticketOwnerName: String,
  threadName: String,
  mainReason: String,
}, { collection: 'discord_conversations', timestamps: true });

const DiscordConversation = mongoose.model('DiscordConversation', DiscordConversationSchema);

export interface DiscordTranscriptMessage {
  index?: number;
  author?: string;
  user_id?: string;
  is_bot?: boolean;
  content?: string;
  created?: number | string;
  embeds?: Array<{ description?: string }>;
}

export interface DiscordTranscript {
  ticket_id?: string;
  channel?: { id?: string; name?: string };
  messages?: DiscordTranscriptMessage[];
}

function cleanText(text: string): string {
  return text
    .replace(/<@[!&]?\d+>/g, '') 
    .replace(/<#\d+>/g, '')      
    .replace(/@\w+/g, '')        
    .replace(/https?:\/\/\S+/g, '') 
    .replace(/\s+/g, ' ')        
    .trim();
}

function getMessageText(message: DiscordTranscriptMessage): string {
  const content = (message.content ?? '').trim();
  if (content) return content;
  return (message.embeds ?? []).map((e) => (e.description ?? '').trim()).filter((t) => t.length > 0).join('\n');
}

function extractReasonFromTicketMessage(message: DiscordTranscriptMessage): string | null {
  const embedDescription = message.embeds?.map((e) => e.description ?? '').join(' ') ?? '';
  const source = `${message.content ?? ''} ${embedDescription}`;
  const reasonMatch = source.match(/Reason\s*:\s*(.+?)(?:TicketTool\.xyz|$)/is);
  if (reasonMatch?.[1]) {
    const cleaned = cleanText(reasonMatch[1]);
    return cleaned.length > 0 ? cleaned : null;
  }
  return null;
}

async function migrate() {
  console.log(`Connecting to MongoDB at ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`Directory not found: ${TARGET_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} transcripts to process.`);

  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(TARGET_DIR, file), 'utf8')) as DiscordTranscript;
    const ticketNumber = raw.ticket_id ?? file.match(/_(\d+)\.json$/)?.[1] ?? undefined;
    
    if (!ticketNumber) {
      console.log(`Skipping ${file} - no ticket number`);
      skipped++;
      continue;
    }

    // Skip if already in DB
    const existing = await DiscordConversation.findOne({ ticketNumber });
    if (existing) {
      console.log(`Skipping ${ticketNumber} - already in DB`);
      skipped++;
      continue;
    }

    const messages: any[] = [];
    const rawMessages = raw.messages || [];

    // Detect owner
    const openingMessage = rawMessages.find((m) => m.author === 'Ticket Tool' && m.index === 1);
    const mentionMatch = openingMessage ? getMessageText(openingMessage).match(/<@!?(\d+)>/) : null;
    const ownerId = mentionMatch?.[1] ?? null;
    const ownerMessage = ownerId ? rawMessages.find((m) => m.user_id === ownerId && m.author !== 'Ticket Tool') : null;
    const ownerName = ownerMessage?.author ?? null;

    let mainReason = '';

    for (const msg of rawMessages) {
      if (msg.author === 'Ticket Tool' && msg.index === 1) {
        const reason = extractReasonFromTicketMessage(msg);
        if (reason) {
          mainReason = reason;
          messages.push({
            role: 'system',
            type: 'ticket_reason',
            text: reason,
            authorId: 'ticket-tool',
            authorName: 'Ticket Tool',
            timestamp: new Date(msg.created || Date.now())
          });
        }
        continue;
      }

      const text = getMessageText(msg);
      if (!text) continue;

      const role = (msg.is_bot || msg.author === 'Ticket Tool' || msg.author === 'Help Tool') ? 'system' : 
                   (msg.user_id === ownerId || msg.author === ownerName) ? 'user' : 'agent';

      messages.push({
        role,
        type: 'message',
        text,
        authorId: msg.user_id || 'unknown',
        authorName: msg.author || 'unknown',
        timestamp: new Date(msg.created || Date.now())
      });
    }

    const channelId = raw.channel?.id || `legacy-channel-${ticketNumber}`;
    const threadName = raw.channel?.name || `closed-${ticketNumber}`;

    await DiscordConversation.create({
      ticketNumber,
      discordChannelId: channelId,
      status: 'closed',
      source: 'discord_transcript',
      messages,
      transcriptProcessed: true,
      ticketOwnerId: ownerId,
      ticketOwnerName: ownerName,
      threadName,
      mainReason
    });

    console.log(`Migrated ticket #${ticketNumber}`);
    inserted++;
  }

  console.log(`Migration Complete. Migrated: ${inserted}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
