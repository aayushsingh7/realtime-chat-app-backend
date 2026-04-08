import {Document, Types} from "mongoose";
import type {IUser, IStatus, IEmoji, IAttachment, IMessage, IChat, IChatMember, MessageType} from "./app";

export interface IUserDoc
    extends Omit<IUser, "_id" | "blockedUsers" | "starredMessages" | "status" | "clearedChats" | "deletedChats">,
        Document {
    _id: Types.ObjectId;
    blockedUsers: Types.ObjectId[];
    starredMessages: Types.ObjectId[];
    status: Types.ObjectId[];
    clearedChats: Map<Types.ObjectId, Date>;
    deletedChats: Map<string, Date>;
}

export interface IStatusDoc extends Omit<IStatus, "_id" | "postedBy" | "seenBy" | "chatId">, Document {
    _id: Types.ObjectId;
    postedBy: Types.ObjectId;
    seenBy: Types.ObjectId[];
    chatId: Types.ObjectId;
}

export interface IEmojiDoc {
    user: Types.ObjectId;
    emoji: string;
}

export interface IMessageDoc
    extends Omit<
            IMessage,
            | "_id"
            | "sender"
            | "chat"
            | "attachment"
            | "reactEmoji"
            | "createdAt"
            | "updatedAt"
            | "status"
            | "actor"
            | "target"
            | "repliedTo"
        >,
        Document {
    _id: Types.ObjectId;
    sender: Types.ObjectId;
    chat: Types.ObjectId;
    attachment: IAttachment | null;
    reactEmoji?: IEmojiDoc;
    actor?: {_id: Types.ObjectId; name: string};
    target?: {_id: Types.ObjectId; name: string};
    repliedTo?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IChatDoc extends Omit<IChat, "_id" | "latestMessage" | "updatedAt">, Document {
    _id: Types.ObjectId;
    admins: Types.ObjectId[];
    users: Types.ObjectId[];
    latestMessage: Types.ObjectId | IMessageDoc;
    createdBy: Types.ObjectId;
    description: string;
    removedUsers: Map<string, Date>;
    theme: {URL: string; name: string};
    updatedAt: Date;
}

export interface IChatMemberDoc extends Omit<IChatMember, "_id" | "user" | "chat">, Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    chat: Types.ObjectId;
}

export interface IChatMemberDocPopulated extends Omit<IChatMemberDoc, "user"> {
    user: IUserDoc;
}