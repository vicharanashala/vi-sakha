const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to:", process.env.MONGODB_URI);
    const count = await mongoose.connection.collection('conversations').countDocuments({ studentId: { $exists: true } });
    console.log("Conversations in 'conversations' collection with studentId:", count);
    
    // Check discord_conversations
    const discordCount = await mongoose.connection.collection('discord_conversations').countDocuments({});
    console.log("Conversations in 'discord_conversations' collection:", discordCount);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
