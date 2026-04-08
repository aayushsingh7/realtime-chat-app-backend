export type MessageType = "text" | "image" | "video" | "document" | "voice" | "alert";

export interface IUser {
    _id: string;
    name: string;
    image: string;
    password: string;
    email: string;
    blockedUsers: string[];
    starredMessages: string[];
    onlineStatus: boolean;
    lastSeen: Date;
    description: string;
    role: "admin" | "user" | "guest";
    username: string;
    slogan: string;
    createdAt: Date;
    activeStatus: boolean;
    status: string[];
    clearedChats: Record<string, Date>;
    deletedChats: Record<string, Date>;
}

export interface IStatus {
    _id: string;
    extension: string;
    fileType: string;
    url: string;
    postedBy: string;
    seenBy: string[];
    chatId: string;
}

export interface IEmoji {
    user: string;
    emoji: string;
}

export interface IAttachment {
    name: string;
    size: string;
    extension: string;
    url: string;
    type: "image" | "video" | "document";
}

export interface IReply {
    user: {
        _id: string;
        name: string;
    };
    message: {
        _id: string;
        attachment: IAttachment | null;
        text: string | null;
    };
}

export interface IMessage {
    _id: string;
    sender: IUser;
    text: string;
    msgType: MessageType;
    isReply: boolean;
    chat: string;
    attachment: IAttachment | null;
    reactEmoji?: IEmoji;
    createdAt: string;
    updatedAt: string;
    actor?: {_id: string; name: string};
    target?: {_id: string; name: string};
    repliedTo?: IReply;
    presignedUrl?: string;
}

export interface IAlertMessage {
    chatId: string;
    actor: {_id: string; name: string};
    message: string;
    target?: {_id: string; name: string};
    id?: string;
}

export interface IChat {
    _id: string;
    name: string;
    image: string;
    updatedAt: string;
    lastReadAt: string;
    unreadCount: number;
    oldestLastSeen: number;
    oldestOnline: number;
    latestMessage: IMessage;
    isGroupChat: boolean;
}

export interface IChatFull {
    _id: string;
    isGroupChat: boolean;
    users: string[];
    latestMessage: IMessage;
    createdBy: string;
    image: string;
    name: string;
    description: string;
    theme: {URL: string; name: string};
    createdAt: string;
    updatedAt: string;
    lastReadAt: string;
    unreadCount: number;
    oldestLastSeen: number;
    oldestOnline: number;
}

export interface IChatFullPopulated extends Omit<IChatFull, "users"> {
      users:IUser[]
}

export interface IChatMember {
    _id: string;
    user: string;
    chat: string;
    unreadCount: number;
    lastReadAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
