import { RequestHandler, Request } from "express";
import Chat from "../models/chatModel";
import Message from "../models/messageModel";
import User from "../models/userMode";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

const addMessage: RequestHandler = async (req, res) => {
  try {
    const {
      message,
      msgType,
      chatId,
      file_url,
      userId,
      fileName,
      document,
      fileSize,
      isReply,
      repliedTo,
      caption,
    }: {
      message: string;
      msgType: string;
      chatId: string;
      file_url: string;
      userId: string;
      fileName: string;
      document: boolean;
      fileSize: number;
      isReply: boolean;
      repliedTo: string;
      caption: string;
    } = req.body;

    let messageData: string;

    if (file_url) {
      messageData = file_url;
    } else {
      messageData = message;
    }

    const newMessage = new Message({
      isReply: isReply,
      repliedTo: isReply ? repliedTo : null,
      sender: userId,
      msgType: file_url ? msgType : "text",
      message: messageData,
      fileName: fileName || null,
      document: document,
      seenBy: [userId],
      fileSize: fileSize || 0,
      chat: chatId,
      caption: caption,
    });

    let saveMessage: mongoose.Document = await newMessage.save();

    const populateMessage = await saveMessage.populate([
      { path: "seenBy", select: "_id username" },
      { path: "sender", select: "_id image name" },
      {
        path: "repliedTo",
        select: "_id message fileName msgType sender",
        populate: { path: "sender", model: "user", select: "name" },
      },
    ]);

    const updateChat = await Chat.updateOne(
      { _id: chatId },
      {
        $push: { messages: saveMessage._id },
        $set: { chatDeletedFor: [], latestMessage: saveMessage._id },
      }
    );

    if (file_url) {
      const addNewMedia = await Chat.updateOne(
        { _id: chatId },
        {
          $push: {
            mediaFiles: {
              _id: saveMessage._id,
              extension: fileName.substring(fileName.lastIndexOf(".") + 1),
              message: file_url,
              msgType: msgType,
              document: document,
            },
          },
        }
      );
    }

    if (updateChat.modifiedCount > 0) {
      res.status(200).send({
        success: true,
        message: "New message added",
        newMessage: populateMessage,
      });
    } else {
      res.status(400).send({
        success: true,
        message: "Something went wrong, plz try again",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const addReaction: RequestHandler = async (req, res) => {
  try {
    const { messageId, emoji, userId } = req.body;
    let reactMessage;
    const existingReaction = await Message.findOne({
      _id: messageId,
      "reactEmoji.user": userId,
    });

    if (existingReaction) {
      reactMessage = await Message.updateOne(
        { _id: messageId, "reactEmoji.user": userId },
        { $set: { "reactEmoji.$.emoji": emoji } }
      );
    } else {
      reactMessage = await Message.updateOne(
        { _id: messageId },
        { $push: { reactEmoji: { user: userId, emoji: emoji } } }
      );
    }

    if (reactMessage.modifiedCount === 1) {
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
    const { messageIds, prevMessageId } = req.body;

    let removeMessage = await Message.deleteMany({ _id: { $in: messageIds } });
    let removeMessageIdsFromChat = await Chat.updateOne(
      { messages: { $in: messageIds } },
      {
        $pull: { messages: { $in: messageIds } },
        $set: { latestMessage: prevMessageId },
      }
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

    await (
      await newMessage.save()
    ).populate({ path: "sender", select: "_id", model: "user" });

    let updateLatestMessage = await Chat.updateOne(
      { _id: chatId },
      {
        $set: { latestMessage: newMessage._id },
        $push: { messages: newMessage._id },
      }
    );

    if (message === "removed") {
      if (user) {
        let updateUserRemovedDate = await Chat.updateOne(
          { _id: chatId, "removedUsers._id": user._id },
          { $set: { "removedUsers.$.createdAt": new Date().toISOString() } }
        );
      }
    }

    if (message === "left") {
      if (moderator._id) {
        let updateUserRemovedDate = await Chat.updateOne(
          { _id: chatId, "removedUsers._id": moderator._id },
          { $set: { "removedUsers.$.createdAt": new Date().toISOString() } }
        );
      }
    }

    if (updateLatestMessage.modifiedCount === 1) {
      res.status(200).send({
        success: true,
        message: "Alert message added",
        alertMessage: newMessage,
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const messages: RequestHandler = async (req, res) => {
  try {
    const offset = Number(req.query.offset);
    const { chatId } = req.query;
    const response: any = await Chat.findOne({
      _id: chatId,
    }).populate({
      path: "messages",
      options: { limit: 25, sort: { createdAt: -1 }, skip: offset }, // Move skip option here
      populate: [
        {
          path: "reactEmoji",
          populate: {
            path: "user",
            model: "user",
            select: "_id image name email",
          },
        },
        {
          path: "seenBy",
          model: "user",
          select: "_id username",
        },
        {
          path: "sender",
          model: "user",
          select: "_id image name email description slogan createdAt",
        },
        {
          path: "repliedTo",
          model: "message", // Assuming "message" is the model name for messages
          select: "_id message fileName msgType sender",
          populate: {
            path: "sender",
            model: "user",
            select: "name",
          },
        },
      ],
    });

    const totalMessages = await Message.countDocuments({ chat: chatId });

    if (response.messages) {
      res.status(200).send({
        success: true,
        message: "Messages fetched successfully",
        messages: response.messages,
        totalDocumentsCount: totalMessages,
        isMore: totalMessages > offset + 25,
      });
    } else {
      res.status(200).send({
        success: false,
        message: "Something went wrong while fetching messages",
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
        populate: {
          path: "users",
          select: "_id username name image slogan",
          model: "user",
        },
        select: "_id users image name isGroupChat description ",
      });
    if (response.length > 0) {
      res.status(200).send({
        success: true,
        message: "Starred messages fetched sucessfully",
        messages: response,
      });
    } else {
      res.status(404).send({
        success: false,
        message: "Something went wrong while fetching messages",
        messages: [],
      });
    }
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
        populate: {
          path: "users",
          select: "_id username name image slogan",
          model: "user",
        },
        select: "_id users image name isGroupChat description ",
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
