import Chat from "../models/chatModel";
import Message from "../models/messageModel";
import User from "../models/userModel";
import ChatMember from "../models/chatMemberModel";
import CustomError from "../utils/customError";

class MessageService {
  async addMessage(data: any) {
    const {
      message,
      msgType,
      chatId,
      file_url,
      fileName,
      document,
      fileSize,
      isReply,
      repliedTo,
      caption,
      userId,
    } = data;

    const messageData = file_url || message;
    const newMessage = new Message({
      isReply,
      repliedTo: isReply ? repliedTo : null,
      sender: userId,
      msgType: file_url ? msgType : "text",
      message: messageData,
      fileName: fileName || null,
      document: document || false,
      fileSize: fileSize || 0,
      chat: chatId,
      caption,
    });

    const saved = await newMessage.save();

    await saved.populate([
      {
        path: "reactEmoji",
        populate: {
          path: "user",
          model: "user",
          select: "_id name image",
        },
      },
      { path: "sender", select: "_id username name image", model: "user" },
    ]);

    const finalMessage = isReply
      ? await saved.populate({
          path: "repliedTo",
          model: "message",
          select: "_id message fileName msgType sender",
        })
      : saved;

    await Chat.updateOne(
      { _id: chatId },
      {
        $set: { latestMessage: newMessage._id },
      }
    );

    return finalMessage;
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    let update = await Message.updateOne(
      { _id: messageId, "reactEmoji.user": userId },
      { $set: { "reactEmoji.$.emoji": emoji } }
    );

    if (update.modifiedCount === 0) {
      update = await Message.updateOne(
        { _id: messageId },
        { $push: { reactEmoji: { user: userId, emoji: emoji } } }
      );
    }

    if (update.modifiedCount !== 1) {
      throw new CustomError("Something went wrong while adding reaction", 400);
    }
    return true;
  }

  async removeReaction(messageId: string, userId: string) {
    const reactMessage = await Message.updateOne(
      { _id: messageId },
      { $pull: { reactEmoji: { user: userId } } }
    );

    if (reactMessage.modifiedCount !== 1) {
      throw new CustomError("Something went wrong while removing reaction", 400);
    }
    return true;
  }

  async deleteMessages(messageIds: string[], chatId: string) {
    const removeMessage = await Message.deleteMany({ _id: { $in: messageIds } });
    
    const remaining = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const newLatest = remaining.length > 0 ? remaining[0]._id : null;
    await Chat.updateOne(
      { _id: chatId }, // Fixed potentially wrong selector from original code if it was 'chat: chatId'
      { $set: { latestMessage: newLatest } }
    );

    if (removeMessage.deletedCount === 0) {
      throw new CustomError("Something went wrong while deleting the message", 400);
    }
    return true;
  }

  async addEventAlertMessage(data: any) {
    const { chatId, message, msgType, moderator, user, eventPerformed } = data;

    const newMessage = new Message({
      sender: process.env.MSG_BOT_ID,
      msgType: msgType,
      message: message,
      moderator: moderator,
      user: user,
      eventPerformed: eventPerformed,
      chat: chatId,
    });

    await newMessage.save();
    await newMessage.populate({ path: "sender", model: "user", select: "_id" });

    return newMessage;
  }

  async getMessages(chatId: string, offset: number, userId: string) {
    const messages = await Message.find({ chat: chatId })
      .populate([
        {
          path: "reactEmoji",
          populate: {
            path: "user",
            model: "user",
            select: "_id name image",
          },
        },
        { path: "sender", select: "_id username name image", model: "user" },
        {
          path: "repliedTo",
          model: "message",
          select: "_id message msgType sender fileName",
          populate: {
            path: "sender",
            model: "user",
            select: "name",
          },
        },
      ])
      .sort({ createdAt: -1 })
      .limit(21)
      .skip(offset)
      .lean();

    const participants = await ChatMember.find({ chat: chatId })
      .select("user lastSeenMessage unreadCount")
      .lean();

    if (messages.length === 0) {
      throw new CustomError("No messages yet", 404);
    }

    return {
      messages,
      isMore: messages.length > 20,
      participants,
    };
  }

  async getStarredMessages(userId: string) {
    const response = await User.findOne({ _id: userId })
      .select("starredMessages")
      .populate({
        path: "starredMessages",
        model: "message",
        select: "_id document msgType message chat",
        populate: {
          path: "chat",
          model: "chat",
          select: "_id users image",
          populate: {
            path: "users",
            model: "user",
            select: "_id username name image",
          },
        },
      });

    if (!response || response.starredMessages.length === 0) {
      throw new CustomError("No starred messages", 404);
    }
    return response.starredMessages;
  }

  async addToStarredMessages(messageIds: string[], userId: string) {
    const starMessages = await User.updateOne(
      { _id: userId },
      { $push: { starredMessages: { $each: messageIds } } } // Added $each to handle array
    );
    if (starMessages.modifiedCount === 0) {
      throw new CustomError("User not found or message already starred", 404);
    }
    return true;
  }

  async removeFromStarredMessages(messageIds: string[], userId: string) {
    const starMessages = await User.updateOne(
      { _id: userId },
      { $pull: { starredMessages: { $in: messageIds } } }
    );
    if (starMessages.modifiedCount === 0) {
      throw new CustomError("User not found or message not starred", 404);
    }
    return true;
  }

  async searchStarredMessages(userId: string, query: string) {
    const results = await Message.find({
      $and: [
        {
          $or: [
            { message: { $regex: ".*" + query + ".*", $options: "i" } },
            { fileName: { $regex: ".*" + query + ".*", $options: "i" } },
          ],
        },
        { "starredBy.userId": userId },
      ],
    })
      .sort({
        createdAt: -1,
      })
      .populate({
        path: "chat",
        model: "chat",
        select: "_id image name isGroupChat",
      })
      .limit(15);
    
    return results;
  }
}

export default new MessageService();
