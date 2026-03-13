import { Document, Types } from "mongoose";

export interface IEmoji {
  user: Types.ObjectId;
  emoji: string;
}

interface IMessage extends Document {
  _id: Types.ObjectId;
  sender: Types.ObjectId;
  message: string;
  reactEmoji: IEmoji;
  document: boolean;
  eventPerformed: string;
  moderator: {
    _id: Types.ObjectId;
    name: string;
  };
  user: {
    _id: Types.ObjectId;
    name: string;
  };
  fileName: string;
  caption: string;
  isReply: boolean;
  repliedTo: Types.ObjectId;
  fileSize: number;
  chat: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export default IMessage;
