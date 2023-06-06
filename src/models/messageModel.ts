import mongoose, { Document, Model, Schema } from "mongoose";

interface IMessage extends Document {
  sender: string;
  message: string;
  reactEmoji: string;
  msgType: string;
  messageKey:string;
}

const messageSchema: Schema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    msgType: { type: String, default: "text" },
    message: { type: String, default: "string" },
    messageId:{type:String},
    reactEmoji: { type: String, default: "" },
    moderator: {
      _id: { type: String},
      name: { type: String },
    },
    user: {
      _id: { type: String},
      name: { type: String },
    },
    isDeleted:{type:Boolean , default:false},
    messageKey:{type:String},
  },
  { timestamps: true }
);

const Message = mongoose.model(
  "message",
  messageSchema
);

export default Message;
