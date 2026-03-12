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

setupSocketServer(server);