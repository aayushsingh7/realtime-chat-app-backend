import express from "express";
const app = express();
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import "./database/dbConnect";
import cloudinary from "cloudinary";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";
import chatRoutes from "./routes/chatRoutes";
import statusRoutes from "./routes/statusRoutes";
import authRoutes from "./routes/authRoutes";
import cookieParser from "cookie-parser";
import { ChatType, MessageType, UserType } from "./types/types";
import User from "./models/userModel";
import { setupSocketServer } from "./config/socket";

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: [
      "https://main--realtime-chat-app-07.netlify.app",
      "https://realtime-chat-app-07.netlify.app",
      "https://6489fdb7ffbbca0008fbce8e--realtime-chat-app-07.netlify.app",
      "https://chatverse-chat.netlify.app",
      "https://api.cloudinary.com",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use("/api", userRoutes);
app.use("/api", messageRoutes);
app.use("/api", chatRoutes);
app.use("/api", statusRoutes);
app.use("/api", authRoutes);

let server = app.listen(process.env.PORT, () => {
  console.log(`Server Started At PORT: ${process.env.PORT} ✅`);
});

server.on("error", (err) => {
  console.error("Error Starting The Server ❌", err);
});

// setupSocketServer(server);

const io = require("socket.io")(server, {
  cors: {
    // origin: [
    //   "https://main--realtime-chat-app-07.netlify.app",
    //   "https://realtime-chat-app-07.netlify.app",
    //   "https://6489fdb7ffbbca0008fbce8e--realtime-chat-app-07.netlify.app",
    //   "https://chatverse-chat.netlify.app",
    //   "http://localhost:5173",
    // ],
    origin: "*",
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

io.on("connection", (socket: any) => {
  socket.on("setup", (userData: UserType) => {
    socket.userId = userData._id;
    socket.join(socket.userId);
  });

  // socket.on("join chat", async(chatId: string, oldChat:string) => {
  //   if(oldChat) socket.leave(oldChat)
  //   socket.join(chatId);
  //   const sockets = await io.in(chatId).fetchSockets();
  //   const userIds = sockets.map((s:any) => s.userId);
  //   console.log(userIds);
  // });

  // socket.on("leave chat", (chatId:string)=> {
  //   socket.leave(chatId)
  // })

  socket.on("new message", (newMessage: MessageType, chat: any) => {
    if (!chat || !chat.users) return;
    console.log(chat.users);
    chat.users.forEach((user: UserType) => {
      if (user._id === newMessage.sender._id) return;
      io.in(user._id).emit("new message received", newMessage, chat);
    });
  });

  socket.on(
    "react on message",
    (user: UserType, message: MessageType, emoji: string, chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid chat");
      chat.users.forEach((u: any) => {
        io.in(u._id).emit(
          "react on message received",
          user,
          message,
          emoji,
          chat
        );
      });
    }
  );

  socket.on(
    "remove reaction on message",
    (user: UserType, message: MessageType, emoji: string, chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid chat");
      chat.users.forEach((u: any) => {
        io.in(u._id).emit(
          "remove reaction",
          user._id,
          message._id,
          emoji,
          chat
        );
      });
    }
  );

  socket.on(
    "delete message",
    (userId: string, messageIds: string[], chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid chat");
      chat.users.forEach((user: any) => {
        io.in(user._id).emit(
          "delete message triggered",
          userId,
          messageIds,
          chat
        );
      });
    }
  );

  socket.on("create new chat", (newChat: any) => {
    if (!newChat) return;
    newChat.users.forEach((user: UserType) => {
      io.in(user._id).emit("create new chat triggered", newChat);
    });
  });

  socket.on("add user", (userData: UserType, newChat: ChatType, chat: any) => {
    if (!chat && !chat.users) return console.log("Invalid Chat");
    const updatedChat = {
      ...chat,
      users: [...chat.users, userData],
    };
    updatedChat.users.forEach((user: UserType) => {
      io.in(user._id).emit("user joined", userData, newChat, chat);
    });
  });

  socket.on("remove user", (userData: UserType, chat: any, method: string) => {
    if (!chat && !chat.users) return console.log("Invalid Chat");
    const updatedChat = {
      ...chat,
      users: [...chat.users, userData],
    };
    updatedChat.users.forEach((user: UserType) => {
      io.in(user._id).emit("user removed", userData, chat, method);
    });
  });

  socket.on(
    "edit group details",
    (userData: UserType, newData: ChatType, chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid Chat");
      chat.users.forEach((user: UserType) => {
        io.in(user._id).emit("group details edited", userData, newData, chat);
      });
    }
  );

  socket.on(
    "promote to admin",
    (promoterUserId: string, promotedUserId: string, chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid Chat");
      chat.users.forEach((user: UserType) => {
        io.in(user._id).emit(
          "promoted to admin",
          promoterUserId,
          promotedUserId,
          chat
        );
      });
    }
  );

  socket.on(
    "remove from admin",
    (removerUserId: string, removedUserId: string, chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid Chat");
      chat.users.forEach((user: UserType) => {
        io.in(user._id).emit(
          "removed from admin",
          removerUserId,
          removedUserId,
          chat
        );
      });
    }
  );

  socket.on("message seen", (data:any) => {
    console.log({data})
    data.chat.users.map((user:UserType)=> {
      io.in(user._id).emit("message seen received", data)
    })
    // if (!chat && !chat.users) return console.log("Invalid chat");
    // chat.users.forEach((user: UserType) => {
    //   // if (user._id === u._id) return;
    //   io.in(user._id).emit("message seen received", messageIds, chat, u);
    // });
  });

  socket.on("typing started", (typingUser: UserType, chat: any) => {
    if (!chat && !chat.users) return console.log("Invalid chat");
    chat.users.forEach((user: UserType) => {
      if (user._id === typingUser._id) return;
      io.in(user._id).emit("typing", typingUser, chat);
    });
  });

  socket.on("stop typing", (typingUser: UserType, chat: any) => {
    if (!chat && !chat.users) return console.log("Invalid chat");
    chat.users.forEach((user: UserType) => {
      if (user._id === typingUser._id) return;
      io.in(user._id).emit("typing stopped", typingUser, chat);
    });
  });

  socket.on(
    "change theme",
    (theme: any, chat: any, alertMessage: MessageType) => {
      if (!chat && !chat.users) return console.log("Invalid Chat");
      chat.users.map((user: UserType) => {
        io.in(user._id).emit("theme changed", theme, chat, alertMessage);
      });
    }
  );

  socket.on(
    "block user",
    (userId: string, blockedUserId: string, chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid Chat");
      chat.users.map((user: UserType) => {
        io.in(user._id).emit("user blocked", userId, blockedUserId, chat);
      });
    }
  );

  socket.on(
    "unBlock user",
    (userId: string, blockedUserId: string, chat: any) => {
      if (!chat && !chat.users) return console.log("Invalid Chat");
      chat.users.map((user: UserType) => {
        io.in(user._id).emit("user unBlocked", userId, blockedUserId, chat);
      });
    }
  );

  socket.on("disconnect", async () => {
    const userId = socket.handshake.auth.token;
    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { lastSeen: new Date().toISOString() } }
    );
  });
});
