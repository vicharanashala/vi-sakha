// Backend global configuration settings
export const backendConfig = {
  port: process.env.PORT || 3000,
  mongodbUri: process.env.MONGODB_URI,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: Number(process.env.REDIS_PORT) || 6379,
  sidecarUrl: process.env.EMBEDDING_SIDECAR_URL || 'http://localhost:8001',
};
export default backendConfig;
