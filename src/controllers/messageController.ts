import { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import Chat from "../models/chatModel";
import Message from "../models/messageModel";
import User from "../models/userModel";

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
      userId,
    } = req.body;

    const messageData = file_url || message;
    const newMessage = new Message({
      isReply,
      repliedTo: isReply ? repliedTo : null,
      sender: userId, // better & safe
      msgType: file_url ? msgType : "text",
      message: messageData,
      fileName: fileName || null,
      document,
      seenBy: [userId],
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

    // await Chat.updateOne(
    //   { _id: chatId },
    //   {
    //     $set: { latestMessage: newMessage._id },
    //   }
    // );

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
    const id = req.params.id
    const { emoji, userId } = req.body;
    let update = await Message.updateOne(
      { _id: id, "reactEmoji.user": userId },
      { $set: { "reactEmoji.$.emoji": emoji } }
    );

    if (update.modifiedCount == 0) {
      update = await Message.updateOne(
        { _id: id },
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
    const id = req.params.id;
    const {userId } = req.body;
    let reactMessage = await Message.updateOne(
      { _id: id },
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

const deleteMessages: RequestHandler = async (req, res) => {
  try {
    const { messageIds, chatId } = req.body;
    console.log({ messageIds, chatId });
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
      chat: chatId,
    });

    await newMessage.save()
    await newMessage.populate({path:"sender", model:"user", select:"_id"})
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

    if (response?.starredMessages.length == 0) {
      res.status(200).send({ success: true, message: "No starred messages" , messages:[]});
      return;
    }
    res.status(200).send({
      success: true,
      message: "Starred messages fetched sucessfully",
      messages: response?.starredMessages,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const addToStarredMessages: RequestHandler = async (req, res) => {
  try {
    const { messageIds, userId } = req.body;

    const starMessages = await User.updateOne(
      { _id: userId },
      { $push: { starredMessages: messageIds } }
    );
    if (starMessages.modifiedCount > 0) {
      res.status(200).send({
        success: true,
        message: "Message(s) added to starred messages",
      });
    } else {
      res.status(404).send({ success: false, message: "User not found" });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const removeFromStarredMessages: RequestHandler = async (req, res) => {
  try {
    const { messageIds, userId } = req.body;

    const starMessages = await User.updateOne(
      { _id: userId },
      { $pull: { starredMessages: { $in: messageIds } } }
    );
    if (starMessages.modifiedCount > 0) {
      res.status(200).send({
        success: true,
        message: "Message(s) removed from starred messages",
      });
    } else {
      res.status(404).send({ success: false, message: "User not found" });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const messagesSeen: RequestHandler = async (req, res) => {
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
  deleteMessages,
  addEventAlertMessage,
  messages,
  getStarredMessages,
  addToStarredMessages,
  messagesSeen,
  removeFromStarredMessages,
  searchStarredMessages,
};
