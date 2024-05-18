import mongoose, { Model, Schema } from "mongoose";

interface ChatInt {
  isGroupChat: boolean;
  admins: string[];
  users: string[];
  latestMessage: string;
  messages: string[];
  createdBy: string;
  image: string;
  name: string;
  discription: string;
  removedUsers: {}[];
  chatDeletedFor: {}[];
  chatClearedFor: {}[];
}

const chatModel = new mongoose.Schema(
  {
    isGroupChat: { type: Boolean, default: false },
    admins: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] },
    ],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] }],
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "message",
    },
    messages: [
      { type: mongoose.Schema.Types.ObjectId, ref: "message", default: [] },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    image: { type: String, default: "" },
    name: { type: String, default: "user-chat" },
    description: { type: String, default: "" },
    removedUsers: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: new Date().toISOString() },
      },
      { _id: false },
    ],
    chatClearedFor: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: new Date().toISOString() },
        default: [],
      },
      { _id: false },
    ],
    chatDeletedFor: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: new Date().toISOString() },
        default: [],
      },
      { _id: false },
    ],
    mediaFiles: [
      {
        _id: { type: String },
        extension: { type: String },
        message: { type: String },
        msgType: { type: String },
        document: { type: Boolean },
        default: [],
      },
    ],
    theme: {
      URL: {
        type: String,
        default:
          "https://i.pinimg.com/736x/ba/c8/15/bac815fbeff16270f635ad30c00d71f6.jpg",
      },
      name: { type: String, default: "default" },
    },
  },
  { timestamps: true }
);

const Chat = mongoose.model("chat", chatModel);

export default Chat;
