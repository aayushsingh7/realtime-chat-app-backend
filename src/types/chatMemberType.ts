import { Document, Types } from "mongoose";

interface IChatMember extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  chat: Types.ObjectId;
  unreadCount: number;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default IChatMember;
