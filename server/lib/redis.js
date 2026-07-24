import { createClient } from "redis";

let redisClient = null;
let useFallback = true;
const memoryStore = new Map();

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

if (process.env.REDIS_URL || process.env.USE_REDIS === "true") {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => {
      console.warn("Redis client error, falling back to memory store:", err.message);
      useFallback = true;
    });
    
    await redisClient.connect();
    useFallback = false;
    console.log("Connected to Redis successfully.");
  } catch (err) {
    console.warn("Redis connection failed, falling back to memory store:", err.message);
    useFallback = true;
  }
}

export const getSession = async (key) => {
  if (useFallback || !redisClient) {
    const val = memoryStore.get(key);
    return val ? JSON.parse(val) : null;
  }
  try {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error("Redis get failed, reading from memory fallback:", err.message);
    const val = memoryStore.get(key);
    return val ? JSON.parse(val) : null;
  }
};

export const setSession = async (key, val, ttlSeconds = 3600) => {
  const strVal = JSON.stringify(val);
  memoryStore.set(key, strVal); // always mirror to fallback
  
  if (useFallback || !redisClient) return;
  try {
    await redisClient.set(key, strVal, {
      EX: ttlSeconds,
    });
  } catch (err) {
    console.error("Redis set failed:", err.message);
  }
};

export const delSession = async (key) => {
  memoryStore.delete(key);
  if (useFallback || !redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error("Redis del failed:", err.message);
  }
};
