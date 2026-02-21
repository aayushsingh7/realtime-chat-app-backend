import { redis } from "../config/redis";
import Chat from "../models/chatModel";
import User from "../models/userModel";


const validateChat = async (chatId: string) => {
  const key = `chat:valid:${chatId}`;
  let status = await redis.get(key);

  if (!status) {
    const exists = await Chat.exists({ _id: chatId });

    if (!exists) {
      await redis.set(key, "0", "EX", 300);
      return false;
    }

    await redis.set(key, "1", "EX", 3600);
    return true;
  }

  return status === "1";
};

const validateUser = async (userId: string) => {
  const key = `user:valid:${userId}`;
  let status = await redis.get(key);

  if (!status) {
    const exists = await User.exists({ _id: userId });

    if (!exists) {
      await redis.set(key, "0", "EX", 300);
      return false;
    }

    await redis.set(key, "1", "EX", 3600);
    return true;
  }

  return status === "1";
};

const validateInput = async ({
  chatId,
  userId,
}: {
  chatId?: string;
  userId?: string;
}) => {
  if (userId && !(await validateUser(userId))) return false;
  if (chatId && !(await validateChat(chatId))) return false;
  return true;
};
