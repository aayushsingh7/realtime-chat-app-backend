import { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import Chat from "../models/chatModel";
import Message from "../models/messageModel";

const addMessage: RequestHandler = async (req, res) => {
  try {
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
      sender,
    } = req.body;

    const messageData = file_url || message;

    const newMessage = new Message({
      isReply,
      repliedTo: isReply ? repliedTo : null,
      sender: sender, // better & safe
      msgType: file_url ? msgType : "text",
      message: messageData,
      fileName: fileName || null,
      document,
      seenBy: [sender],
      fileSize: fileSize || 0,
      chat: chatId,
      caption,
    });

    const saved = await newMessage.save();

    const finalMessage = isReply
      ? await saved.populate({
          path: "repliedTo",
          select: "_id message fileName msgType sender",
        })
      : saved;

    //     // const updateChat = await Chat.updateOne(
    //     //   { _id: chatId },
    //     //   {
    //     //     $push: { messages: saveMessage._id },
    //     //     $set: { chatDeletedFor: [], latestMessage: saveMessage._id },
    //     //   }
    //     // );

    //     // if (file_url) {
    //     //   const addNewMedia = await Chat.updateOne(
    //     //     { _id: chatId },
    //     //     {
    //     //       $push: {
    //     //         mediaFiles: {
    //     //           _id: saveMessage._id,
    //     //           extension: fileName.substring(fileName.lastIndexOf(".") + 1),
    //     //           message: file_url,
    //     //           msgType: msgType,
    //     //           document: document,
    //     //         },
    //     //       },
    //     //     }
    //     //   );
    //     // }

    return res.status(200).send({
      success: true,
      message: "New message added",
      newMessage: finalMessage,
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send({ success: false, message: err.message });
  }
};

const addReaction: RequestHandler = async (req, res) => {
  try {
    const { messageId, emoji, userId } = req.body;
    let update = await Message.updateOne(
      { _id: messageId, "reactEmoji.user": userId },
      { $set: { "reactEmoji.$.emoji": emoji } }
    );

    if (update.modifiedCount == 0) {
      update = await Message.updateOne(
        { _id: messageId },
        { $push: { reactEmoji: { user: userId, emoji: emoji } } }
      );
    }

    if (update.modifiedCount === 1) {
      res.status(200).send({ success: true, message: "Reacted to message" });
    } else {
      res.status(200).send({ success: false, message: "Something went wrong" });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const removeReaction: RequestHandler = async (req, res) => {
  try {
    const { messageId, userId } = req.body;
    let reactMessage = await Message.updateOne(
      { _id: messageId },
      { $pull: { reactEmoji: { user: userId } } }
    );
    if (reactMessage.modifiedCount === 1) {
      res
        .status(200)
        .send({ success: true, message: "Reacted from message removed" });
    } else {
      res.status(400).send({ success: false, message: "Something went wrong" });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const deleteMessage: RequestHandler = async (req, res) => {
  try {
    const { messageIds, chatId } = req.body;
    let removeMessage = await Message.deleteMany({ _id: { $in: messageIds } });
    const remaining = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const newLatest = remaining.length > 0 ? remaining[0]._id : null;
    await Chat.updateOne(
      { chat: chatId },
      { $set: { latestMessage: newLatest } }
    );

    if (removeMessage.deletedCount > 0) {
      res.status(200).send({ success: true, message: "Message deleted" });
    } else {
      res.status(400).send({
        success: true,
        message: "Something went wrong while deleting the message",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const addEventAlertMessage: RequestHandler = async (req, res) => {
  try {
    const { chatId, message, msgType, moderator, user, eventPerformed } =
      req.body;

    const newMessage = new Message({
      sender: process.env.MSG_BOT_ID,
      msgType: msgType,
      message: message,
      moderator: moderator,
      user: user,
      eventPerformed: eventPerformed,
    });

    await newMessage.save();
    // await (
    //   await newMessage.save()
    // ).populate({ path: "sender", select: "_id", model: "user" });

    // let updateLatestMessage = await Chat.updateOne(
    //   { _id: chatId },
    //   {
    //     $set: { latestMessage: newMessage._id },
    //   }
    // );

    // if (message === "removed" && user) {
    //   await Chat.updateOne(
    //     { _id: chatId, "removedUsers._id": user._id },
    //     { $set: { "removedUsers.$.createdAt": new Date().toISOString() } }
    //   );
    // }

    // if (message === "left" && moderator._id) {
    //     await Chat.updateOne(
    //       { _id: chatId, "removedUsers._id": moderator._id },
    //       { $set: { "removedUsers.$.createdAt": new Date().toISOString() } }
    //     );
    // }

    res.status(200).send({
      success: true,
      message: "Alert message added",
      alertMessage: newMessage,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const messages: RequestHandler = async (req, res) => {
  try {
    const offset = Number(req.query.offset);
    const chatId = req.query.chatId;

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
      .limit(20)
      .skip(offset)
      .lean();

    const totalMessages = await Message.countDocuments({ chat: chatId });
    if (messages.length > 0) {
      res.status(200).send({
        success: true,
        message: "Messages fetched successfully",
        messages: messages,
        totalDocumentsCount: totalMessages,
        isMore: totalMessages > offset + 25,
      });
    } else {
      res.status(200).send({
        success: false,
        message: "No messages yet",
        messages: [],
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const getStarredMessages: RequestHandler = async (req, res) => {
  try {
    const { userId }: { userId: string } = req.body;
    const response = await Message.find({ "starredBy.userId": userId })
      .sort({
        createdAt: -1,
      })
      .populate({
        path: "chat",
        model: "chat",
      //   populate: {
      //     path: "users",
      //     select: "_id username name image slogan",
      //     model: "user",
      //   },
        select: "_id image name isGroupChat",
      });
 
      res.status(200).send({
        success: true,
        message:response.length > 0 ?  "Starred messages fetched sucessfully" : "No starred messages",
        messages: response,
      });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const addToStarredMessages: RequestHandler = async (req, res) => {
  try {
    const { messageIds, userId } = req.body;

    const starMessages = await Message.updateMany(
      { _id: { $in: messageIds } },
      { $push: { starredBy: { userId: userId } } }
    );
    if (starMessages.modifiedCount > 0) {
      res.status(200).send({
        success: true,
        message: "Message(s) added to starred messages",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const removeFromStarredMessages: RequestHandler = async (req, res) => {
  try {
    const { messageIds, userId } = req.body;

    const starMessages = await Message.updateMany(
      { _id: { $in: messageIds } },
      { $pull: { starredBy: { userId: userId } } }
    );
    if (starMessages.modifiedCount > 0) {
      res.status(200).send({
        success: true,
        message: "Message(s) removed from starred messages",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const messageSeen: RequestHandler = async (req, res) => {
  try {
    const { messageIds, userId } = req.body;

    const objectIdArray = messageIds.map((id: string) => {
      return new ObjectId(id);
    });

    const response = await Message.updateMany(
      { _id: { $in: objectIdArray } },
      { $push: { seenBy: userId } }
    );
    if (response.modifiedCount > 0) {
      res.status(200).send({ success: true, message: "Success" });
    }
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

const searchStarredMessages: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.body;
    const { query } = req.query;
    let results = await Message.find({
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
        // populate: {
        //   path: "users",
        //   select: "_id username name image slogan",
        //   model: "user",
        // },
        select: "_id image name isGroupChat",
      })
      .limit(15);
    res.status(200).send({
      success: true,
      message: "Starred messages fetched sucessfully",
      messages: results,
    });
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export default {
  addMessage,
  addReaction,
  removeReaction,
  deleteMessage,
  addEventAlertMessage,
  messages,
  getStarredMessages,
  addToStarredMessages,
  messageSeen,
  removeFromStarredMessages,
  searchStarredMessages,
};
