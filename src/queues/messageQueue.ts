import {Queue} from "bullmq";
import {redis} from "../config/redis";

const messageQueue = new Queue("message-processing-queue", {connection: redis});

export const addNewMessageJob = async (data: any) => {
    await messageQueue.add("new-message", data, {
        removeOnComplete: true,
        attempts: 3,
    });
};

export default messageQueue;
