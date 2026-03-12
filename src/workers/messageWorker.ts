import {Emitter} from "@socket.io/redis-emitter";
import {Job, Worker} from "bullmq";
import {createRedisClient, redis} from "../config/redis";
import Chat from "../models/chatModel";
import messageService from "../services/messageService";
import "../database/dbConnect";

const redisClient = createRedisClient();
const emitter = new Emitter(redisClient);

const worker = new Worker(
    "message-processing-queue",
    async (job: Job) => {
        let message = job.data;
        const senderId = message.userId;
        const chatId = message.chatId;
        if (job.name === "new-message") {
            try {
                console.log("new job is started...", message);
                const newMessage = await messageService.addMessage(message);
                emitter.to(`chat:${chatId}`).emit("message:created", newMessage, chatId);
                emitter.to(`user:${senderId}`).emit("message:status", "SENT", message._id, newMessage);

                const ZSET_KEY = `chat:${chatId}:oldest-online`;
                const exists = await redis.exists(ZSET_KEY);

                if (!exists) {
                    const chat = await Chat.findOne({_id: chatId}).select("users").lean();
                    const onlineUsers = await redis.smembers("presence:online");
                    const onlineSet = new Set(onlineUsers);

                    const args: (number | string)[] = [];

                    //@ts-ignore
                    chat.users.forEach((user: any) => {
                        const userId = user._id.toString();
                        const score = onlineSet.has(userId)
                            ? Number.MAX_SAFE_INTEGER
                            : new Date(user.lastSeen || Date.now()).getTime();

                        args.push(score, userId);
                    });

                    if (args.length > 0) {
                        await redis.zadd(ZSET_KEY, ...args);
                    }
                }

                let chatMembers = await redis.smembers(`chat:${chatId}`);
                if (!chatMembers.length) {
                    const chat = await Chat.findOne({_id: chatId}).select("users").lean();
                    //@ts-ignore
                    chatMembers = chat.users.map((u: any) => u._id.toString());
                    await redis.sadd(`chat:${chatId}`, chatMembers);
                }

                const onlineUsers = new Set(await redis.smembers("presence:online"));
                const pipeline = redis.pipeline();

                for (const member of chatMembers) {
                    if (!onlineUsers.has(member)) {
                        pipeline.sadd(`user:${member}:pending_chats`, chatId);
                    } else {
                        pipeline.zadd(ZSET_KEY, Number.MAX_SAFE_INTEGER, member);
                    }
                    pipeline.sadd(`user:${member}:interacted_chats`, chatId);
                }

                await pipeline.exec();
                const oldestOnline = await redis.zrange(ZSET_KEY, 0, 0, "WITHSCORES");
                emitter.to(`chat:${chatId}`).emit(ZSET_KEY, oldestOnline, null);
            } catch (err) {
                console.error("Worker Error:", err);
                emitter.to(`user:${senderId}`).emit("message:status", "FAILED");
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
    console.log("message worker is ready ✅");
});

worker.on("completed", (job: Job) => {
    console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job: any, err: any) => {
    console.log(`Job ${job.id} failed:`, err);
});
