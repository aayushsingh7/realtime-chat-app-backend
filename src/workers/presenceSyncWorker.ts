import {Job, Worker} from "bullmq";
import {createRedisClient, redis} from "../config/redis";
import {Emitter} from "@socket.io/redis-emitter";
const redisClient = createRedisClient();
const emitter = new Emitter(redisClient);

const worker = new Worker(
    "presence-sync-queue",
    async (job: Job) => {
        const {userId} = job.data;

        if (job.name === "presence-sync") {
            try {
                const pendingChats = await redis.smembers(`user:${userId}:pending_chats`);
                if (pendingChats.length === 0) return;
                const pipeline = redis.pipeline();

                for (const chatId of pendingChats) {
                    const ONLINE_KEY = `chat:${chatId}:oldest-online`;
                    pipeline.zadd(ONLINE_KEY, Number.MAX_SAFE_INTEGER, userId);
                    pipeline.zrange(ONLINE_KEY, 0, 0, "WITHSCORES");
                }

                const results = await pipeline.exec();

                pendingChats.forEach((chatId, index) => {
                    const baseIndex = index * 2;
                    //@ts-expect-error
                    const oldestOnlineResult = results[baseIndex + 1][1];

                    const EVENT_NAME = `chat:${chatId}:oldest-online`;

                    emitter.to(`chat:${chatId}`).emit(EVENT_NAME, oldestOnlineResult);
                });

                console.log(`Sync complete for user: ${userId}. Processed ${pendingChats.length} chats.`);
            } catch (err) {
                console.error(`Presence Sync Error for user ${userId}:`, err);
                throw err; 
            }
        }
    },
    {
        connection: createRedisClient(),
        concurrency: 10,
    }
);

worker.on("ready", () => {
    console.log("presence worker is ready ✅");
});

worker.on("completed", (job: Job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job: any, err: any) => {
    console.log(`Job ${job.id} failed:`, err);
});
