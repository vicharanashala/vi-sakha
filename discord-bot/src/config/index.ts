// Discord bot config variables
export const config = {
  mongodbUri: process.env.MONGODB_URI,
  discordToken: process.env.DISCORD_TOKEN,
  backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3000',
};
