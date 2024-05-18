import mongoose, { Document, Schema } from "mongoose";

const messageSchema: Schema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    msgType: { type: String, default: "text" },
    message: { type: String, default: "string" },
    reactEmoji: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        emoji: { type: String },
      },
    ],
    document: { type: Boolean, false: false },
    eventPerformed: { type: String },
    moderator: {
      _id: { type: String },
      name: { type: String },
    },
    user: {
      _id: { type: String },
      name: { type: String },
    },
    fileName: { type: String, default: null },
    seenBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user", default: [] },
    ],
    caption: { type: String, default: null },
    isReply: { type: Boolean, default: false },
    repliedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "message",
      default: null,
    },
    fileSize: { type: Number, default: 0 },
    starredBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
        },
      },
    ],
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "chat" },
  },
  { timestamps: true }
);

const Message = mongoose.model("message", messageSchema);

export default Message;
