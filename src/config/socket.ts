import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createRedisClient, redis } from "../config/redis";
import User from "../models/userModel";
import Chat from "../models/chatModel";
import { addNewMessageJob } from "../queues/messageQueue";
import { presneceSyncJob } from "../queues/presenceSyncQueue";
import ChatMember from "../models/chatMemberModel";
import {IChat, IChatPopulated} from "../types/chatType";
import IUser from "../types/userType";
import IMessage from "../types/messageType";

const pubClient = createRedisClient();
const subClient = pubClient.duplicate();

export const setupSocketServer = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    adapter: createAdapter(pubClient, subClient),
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error("No token"));

    socket.data.userId = token;
    next();
  });

  io.on("connection", (socket: Socket) => {
    // ===== USER EVENTS =====

    socket.on("user:connect", async (userId: string) => {
      console.log("user is connected", userId);
      presneceSyncJob({ userId });
      socket.data.userId = userId;
      socket.join(`user:${userId}`);
      await redis.sadd("presence:online", userId);
      const onlineMem = await redis.smembers("presence:online");
      console.log({ onlineMem });
    });

    socket.on(
      "user:block",
      (chatId: string, blockedBy: string, blocked: string) => {
        socket
          .in(`chat:${chatId}`)
          .emit("user:blocked", blockedBy, blocked, chatId);
      },
    );

    socket.on(
      "user:unblock",

      (chatId: string, unblockedBy: string, unblocked: string) => {
        socket
          .in(`chat:${chatId}`)
          .emit("user:unblocked", unblockedBy, unblocked, chatId);
      },
    );

    // ===== CHAT CORE EVENTS =====

    socket.on("chat:create", async (chatData: IChatPopulated) => {
      if (!chatData) return;
      
      chatData.users.forEach((user:IUser) => {
        socket.to(`user:${user._id}`).emit("chat:created", chatData);
      });
    });

    socket.on("chat:join", async (chatId: string) => {
      console.log("joined chat: ", chatId);
      socket.join(`chat:${chatId}`);
      await redis.set(`user:${socket.data.userId}:current-chat`, chatId);
      const isExists = await redis.exists(`chat:${chatId}:last-seen`);
      if (!isExists) {
        const chat = await Chat.findOne({ _id: chatId }).select("users").lean();
        const args: (number | string)[] = [];
        //@ts-ignore
        chat.users.forEach((user: any) => {
          const userId = user._id.toString();
          console.log({ userId });
          args.push(
            userId == socket.data.userId ? Number.MAX_SAFE_INTEGER : 0,
            userId,
          );
        });

        if (args.length > 0) {
          console.log(args);
          await redis.zadd(`chat:${chatId}:last-seen`, ...args);
        }
      } else {
        console.log("updated the last seen", socket.data.userId);
        await redis.zadd(
          `chat:${chatId}:last-seen`,
          Number.MAX_SAFE_INTEGER,
          socket.data.userId,
        );
      }
      await redis.sadd(`presence:chat:${chatId}`, socket.data.userId);
      const oldestOnline = await redis.zrange(
        `chat:${chatId}:oldest-online`,
        0,
        0,
        "WITHSCORES",
      );
      const oldestLastSeen = await redis.zrange(
        `chat:${chatId}:last-seen`,
        0,
        0,
        "WITHSCORES",
      );
      io.to(`chat:${chatId}`).emit(
        `chat:${chatId}:oldest-online`,
        oldestOnline,
        oldestLastSeen,
      );
    });

    socket.on("chat:leave", async (chatId: string) => {
      console.log("left chat: ", socket.data.userId, chatId);
      if (!socket.data.userId) return;
      socket.leave(`chat:${chatId}`);
      await redis.del(`user:${socket.data.userId}:current-chat`);
      await redis.srem(`presence:chat:${chatId}`, socket.data.userId);
      await redis.zadd(
        `chat:${chatId}:last-seen`,
        Date.now(),
        socket.data.userId,
      );

      const oldestLastSeen = await redis.zrange(
        `chat:${chatId}:last-seen`,
        0,
        0,
        "WITHSCORES",
      );
      io.to(`chat:${chatId}`).emit(
        `chat:${chatId}:oldest-online`,
        null,
        oldestLastSeen,
      );
    });

    socket.on(
      "chat:theme:change",

      (chatId: string, theme: any, alertMessage: IMessage) => {
        socket
          .in(`chat:${chatId}`)
          .emit("chat:theme:changed", theme, chatId, alertMessage);
      },
    );

    // ===== CHAT GROUP EVENTS =====

    socket.on("chat:group:user:add", async (chatId: string, userId: string) => {
      // const user = await User.findOne({_id:userId}).select("");
      // if(!user) return;
      // chat.users.push();
      // await chat.save();
      // chat.users.forEach((member: any) => {
      //   socket
      //     .in(`user:${member}`)
      //     .emit("chat:group:user:added", userId, chatId);
      // });
    });

    socket.on(
      "chat:group:user:remove",
      async (user: IUser, chat: IChatPopulated, method: string) => {
        const updatedChat = {
          ...chat,
          users: chat.users.filter((u) => u._id !== user._id),
        };

        updatedChat.users.forEach((member: IUser) => {
          socket
            .in(`user:${member._id}`)
            .emit("chat:group:user:removed", user, chat, method);
        });
      },
    );

    socket.on(
      "chat:group:edit",
      (updatedBy: IUser, chatData: IChatPopulated, chatId: string) => {
        socket
          .in(`chat:${chatId}`)
          .emit("chat:group:edited", updatedBy, chatData, chatId);
      },
    );

    socket.on(
      "chat:group:admin:promote",
      (promotedBy: string, promoted: string, chatId: string) => {
        socket
          .in(`chat:${chatId}`)
          .emit("chat:group:admin:promoted", promotedBy, promoted);
      },
    );

    socket.on(
      "chat:group:admin:demote",
      (demotedBy: string, demoted: string, chatId: string) => {
        socket
          .in(`chat:${chatId}`)
          .emit("chat:group:admin:demoted", demotedBy, demoted);
      },
    );

    // ===== MESSAGE EVENTS =====

    socket.on("message:create", async (data: any) => {
      // await redis.sadd(`user:${data.userId}:pending_chats`, data.chatId)
      addNewMessageJob(data);
    });

    socket.on(
      "message:delete",
      (userId: string, messageIds: string[], chatId: string) => {
        socket
          .to(`chat:${chatId}`)
          .emit("message:deleted", userId, messageIds, chatId);
      },
    );

    socket.on(
      "message:reaction:add",
      (userId: string, messageId: string, emoji: string, chatId: string) => {
        socket
          .to(`chat:${chatId}`)
          .emit("message:reaction:added", userId, messageId, emoji, chatId);
      },
    );

    socket.on(
      "message:reaction:remove",
      (userId: string, messageId: string, emoji: string, chatId: string) => {
        socket
          .to(`chat:${chatId}`)
          .emit("message:reaction:removed", userId, messageId, emoji, chatId);
      },
    );

    // ===== TYPING EVENTS =====

    socket.on("chat:typing:start", (user: IUser, chatId: string) => {
      socket.in(`chat:${chatId}`).emit("chat:typing:started", user, chatId);
    });

    socket.on("chat:typing:stop", (user: IUser, chatId: string) => {
      socket.in(`chat:${chatId}`).emit("chat:typing:stopped", user, chatId);
    });

    // ===== CONNECTION EVENTS =====

    socket.on("disconnect", async () => {
      const userId = socket.data.userId;
      if (!userId) return;

      const interactedChats = await redis.smembers(
        `user:${userId}:interacted_chats`,
      );
      const pipeline = redis.pipeline();
      const bulkUpdate = [];
      for (let chat of interactedChats) {
        bulkUpdate.push({
          updateOne: {
            filter: { user: userId, chat },
            update: { $set: { lastSeenMessage: Date.now() } },
          },
        });
        pipeline.zadd(`chat:${chat}:oldest-online`, Date.now(), userId);
      }


      const currentChat = await redis.get(`user:${userId}:current-chat`);
      if (currentChat) {
        bulkUpdate.push({
          updateOne: {
            filter: { user: userId, chat:currentChat },
            update: { $set: { lastSeen: Date.now() } },
          },
        });
        pipeline.zadd(`chat:${currentChat}:last-seen`, Date.now(), userId);
        pipeline.del(currentChat);
      }
      pipeline.srem("presence:online", userId);
      pipeline.del(`user:${userId}:interacted_chats`);
      await pipeline.exec();

      if (currentChat) {
        const oldestLastSeen = await redis.zrange(
          `chat:${currentChat}:last-seen`,
          0,
          0,
          "WITHSCORES",
        );
        io.to(`chat:${currentChat}`).emit(
          `chat:${currentChat}:oldest-online`,
          null,
          oldestLastSeen,
        );
      }
      await User.findOneAndUpdate(
        { _id: userId },
        { $set: { lastSeen: new Date().toISOString() } },
      );

      //@ts-expect-error
      await ChatMember.bulkWrite(bulkUpdate);
    });
  });

  return io;
};
