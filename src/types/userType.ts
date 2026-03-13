import { Document, Types } from "mongoose";
import IStatus from "./statusType";

interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  image: string;
  password:string;
  email?: string;
  blockedUsers: Types.ObjectId[];
  starredMessages: Types.ObjectId[];
  onlineStatus: boolean;
  lastSeen: Date;
  description: string;
  role: "admin" | "user" | "guest";
  username: string;
  slogan: string;
  createdAt: Date;
  activeStatus: boolean;
  status: IStatus;
  clearedChats: Map<Types.ObjectId, Date>;
  deletedChats: Map<string, Date>;
}

export default IUser;
