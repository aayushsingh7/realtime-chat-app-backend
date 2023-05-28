import express from "express";
const app = express();
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import "./database/dbConnect";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";
import chatRoutes from "./routes/chatRoutes";
import cookieParser from "cookie-parser";

app.use(express.json());
app.use(cors({ origin:true, credentials: true }));
app.use(cookieParser());
app.use("/api", userRoutes);
app.use("/api", messageRoutes);
app.use("/api", chatRoutes);

let server = app.listen(process.env.PORT, () => {
  console.log(`Server Started At PORT: ${process.env.PORT}`);
});

const io = require("socket.io")(server, {
  cors: {
    origin: "https://realtime-chat-app-07.netlify.app",
  },
});

io.on("connection", (socket: any) => {
  socket.on("newMessage", (newMessage: any, chatId: string) => {
    io.emit("message", newMessage, chatId);
  });

  socket.on("newChatCreated", (newChat: any) => {
    io.emit("newChat", newChat);
  });

  socket.on(
    "updateFileLink",
    (messageId: any, newMessage: any, chatId: any) => {
      io.emit("updateFile", messageId, newMessage.message, chatId);
    }
  );

  socket.on("remove-from-group-active", (chatId: any, userId: any) => {
    io.emit("remove-from-group", chatId, userId);
  });

  socket.on("add-to-group-active", (chatId:any , userData: any) => {
    io.emit("add-to-group",chatId, userData);
  });

  socket.on("chat-alert-message", (alertMessage: any, chatId: any) => {
    io.emit("alert-message", alertMessage, chatId);
  });

  socket.on("add-admin-active", (userId: string, chatId: string) => {
    io.emit("add-admin", userId, chatId);
  });

  socket.on("remove-admin-active", (userId: string, chatId: string) => {
    io.emit("remove-admin", userId, chatId);
  });

  socket.on("leave-group-active",(userId:any,chatId:any)=> {
    io.emit("leave-group",userId,chatId)
  })
}); 
