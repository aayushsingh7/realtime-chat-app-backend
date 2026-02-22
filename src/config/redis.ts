import { Redis } from "ioredis";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const redis = new Redis(REDIS_URL);

redis.on("ready", () => {
  console.log("Redis Connected & Ready ✅");
});

redis.on("error", (err) => {
  console.error("Redis error ❌:", err);
});

export const createRedisClient = () =>
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
  });
