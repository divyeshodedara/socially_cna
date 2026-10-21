import Redis from "ioredis";

export const createRedisClient = (customConfig = {}) => {
  const url = process.env.REDIS_URL;
  const config = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...customConfig,
  };

  const client = url ? new Redis(url, config) : new Redis(config);

  client.on("connect", () => {
    // console.log("Redis connected successfully");
  });

  client.on("error", (err) => {
    console.error("Redis connection error:", err.message);
  });

  return client;
};

// Singleton default client for caching & key-value operations
let defaultClient = null;
export const getRedisClient = () => {
  if (!defaultClient) {
    defaultClient = createRedisClient();
  }
  return defaultClient;
};

export default getRedisClient;
