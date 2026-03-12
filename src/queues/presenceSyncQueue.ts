import {Queue} from "bullmq";
import {redis} from "../config/redis";

const presenceSyncQueue = new Queue("presence-sync-queue", {connection: redis});

export const presneceSyncJob = async (data: any) => {
    await presenceSyncQueue.add("presence-sync", data, {
        removeOnComplete: true,
        attempts: 3,
    });
};

export default presenceSyncQueue;
