import mongoose, { Schema } from "mongoose";

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
    caption: { type: String, default: null },
    isReply: { type: Boolean, default: false },
    repliedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "message",
      default: null,
    },
    fileSize: { type: Number, default: 0 },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "chat" },
  },
  { timestamps: true }
);

messageSchema.index({chat:1, "reactEmoji.user": 1, createdAt: -1})

const Message = mongoose.model("message", messageSchema);

export default Message;
