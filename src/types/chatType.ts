import {Document, Types} from "mongoose";
import IMessage from "./messageType";
import IUser from "./userType";

interface IChat extends Document {
    _id: Types.ObjectId;
    isGroupChat: boolean;
    admins: Types.ObjectId[];
    users: Types.ObjectId[];
    latestMessage: Types.ObjectId | IMessage;
    createdBy: Types.ObjectId;
    image: string;
    name: string;
    description: string;
    removedUsers: Map<string, Date>;
    theme: {
        URL: string;
        name: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

interface IChatPopulated extends Omit<IChat, "users" | "latestMessage"> {
    users: IUser[];
    latestMessage: IMessage;
}

export {IChat, IChatPopulated};
