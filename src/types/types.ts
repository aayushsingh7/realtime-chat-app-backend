interface ThemeType {
  URL: string;
  name: string;
}

interface ReactMessageType {
  userId: string;
  emoji: string;
}

interface StarredMessage {
  chatId: string;
  userId: string;
}

export interface MediaFilesTypes {
  extension: string;
  msgType: string;
  message: string;
  document: boolean;
}

export interface UserType {
  _id: string;
  name: string;
  image: string;
  email?: string;
  password?: string;
  blockedUsers?: Array<UserType>;
  onlineStatus?: boolean;
  lastOnline?: Date;
  description?: string;
  role?: string;
  username?: string;
  slogan?: string;
  createdAt?: Date;
}

export interface MessageType {
  _id: string;
  sender: UserType;
  msgType: string;
  message: string;
  document: boolean;
  seenBy: Array<UserType>;
  reactEmoji?: Array<ReactMessageType>;
  fileName?: string;
  moderator?: UserType;
  user?: UserType;
  caption?: string;
  isReply?: boolean;
  repliedTo?: MessageType;
  status?: string;
  fileSize?: number;
  createdAt?: string;
  starredBy: Array<StarredMessage>;
  eventPerformed?: string;
}

export interface ChatType {
  _id: string;
  isGroupChat: boolean;
  admins: Array<UserType>;
  users: Array<UserType>;
  latestMessage: MessageType;
  messages: Array<MessageType>;
  createdBy: UserType;
  image: string;
  name: string;
  description: string;
  removedUsers: Array<UserType>;
  chatClearedFor: Array<UserType>;
  chatDeletedFor: Array<UserType>;
  createdAt: string;
  updatedAt: string;
  slogan?: string;
  mediaFiles?: Array<MediaFilesTypes>;
  theme?: ThemeType;
  email?: string;
}
