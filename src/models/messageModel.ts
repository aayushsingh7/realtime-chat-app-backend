import mongoose, { Document, Model, Schema } from "mongoose";

interface IMessage extends Document {
  sender: string;
  message: string;
  reactEmoji: string;
  msgType: string;
}

const messageSchema: Schema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    msgType: { type: String, default: "text" },
    message: { type: String, default: "string" },
    reactEmoji: { type: String, default: "" },
    moderator: {
      _id: { type: String},
      name: { type: String },
    },
    user: {
      _id: { type: String},
      name: { type: String },
    },
  },
  { timestamps: true }
);

const Message: Model<IMessage> = mongoose.model<IMessage>(
  "message",
  messageSchema
);

export default Message;
