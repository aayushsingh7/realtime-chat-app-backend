import mongoose, { Model, Schema } from "mongoose";

const chatSchema = new mongoose.Schema(
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    image: {
      type: String,
      default:
        "https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg",
    },
    name: { type: String, default: "user-chat" },
    description: { type: String, default: "" },
    removedUsers: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        createdAt: { type: Date, default: new Date().toISOString() },
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

chatSchema.index({ users: 1, isGroupChat: 1 });

const Chat = mongoose.model("chat", chatSchema);

export default Chat;
