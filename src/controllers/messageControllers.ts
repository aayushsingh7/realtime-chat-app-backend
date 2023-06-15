import { RequestHandler, Request } from "express";
import Chat from "../models/chatModel";
import Message from "../models/messageModel";
import User from "../models/userMode";
import { ObjectId } from "mongodb";
import cloudinary from "cloudinary";


interface Msg {
  sender: string;
  msgType: string;
  message: string;
  reactEmoji?: string;
  messageId:string;
}

interface CustomReq extends Request {
  cloudinary_file_link: string;
  userId: string;
}

const addMessage: RequestHandler = async (req, res) => {
  try {
    const reqS = req as CustomReq;

    cloudinary.v2.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const {
      secondUser,
      message,
      msgType,
      chatId,
      messageId
    }: {
      secondUser: string;
      message: string;
      msgType: string;
      chatId: string;
      messageId:string;
    } = req.body;

    let messageData: string;

    if (msgType === "image" || msgType === "video" || msgType === "gif") {
      // messageData = reqS.cloudinary_file_link;
      let result = await cloudinary.v2.uploader.upload(message,{
        folder:"realtime-chat-app-file-messages"
      })
      messageData = result.secure_url
    } else {
      messageData = message;
    }

    let getLoggedInUser = await User.findOne({ _id: reqS.userId });
    if (!getLoggedInUser)
      return res
        .status(401)
        .send({ success: false, message: "User not exists" });

    const newMessage = new Message<Msg>({
      sender: getLoggedInUser._id.toString(),
      msgType: msgType,
      message: messageData,
     messageId:messageId,
    });

    await newMessage.save();

  await Message.updateOne({_id:newMessage._id},{$set:{messageKey:newMessage._id}})

    if (!chatId) {
      const createNewChat = new Chat({
        isGroupChat: false,
        admins: [],
        users: [reqS.userId, secondUser],
        latestMessage: newMessage._id,
        messages: [newMessage._id],
      });

      await (
        await (
          await (await createNewChat.save()).populate("users")
        ).populate("latestMessage")
      ).populate({
        path: "messages",
        populate: {
          path: "sender",
          model: "user",
          select: "_id image name email discription slogan",
        },
      });

      res.status(201).send({
        success: true,
        message: "New chat created",
        newChat: createNewChat,
        newMessage: newMessage,
      });
    } else {

      const addMessageToChat = await Chat.updateOne(
        { _id: chatId },
        { $push: { messages: newMessage._id } }
      );

      const updateLatestMessage = await Chat.updateOne(
        { _id: chatId },
        { $set: { latestMessage: newMessage._id } }
      );

      const removeDeletedChatUsers = await Chat.updateOne({_id:chatId},{$set:{chatDeletedFor:[]}})

      if (
        addMessageToChat.modifiedCount === 1 &&
        updateLatestMessage.modifiedCount === 1
      ) {
        res
          .status(200)
          .send({
            success: true,
            message: "New message added",
            newMessage: newMessage,
          });
      } else {
        res.status(200).send({
          success: true,
          message: "Something went wrong, plz try again",
        });
      }
    }
  } catch (err: any) {
    res.status(500).send({ success:false , message:err.message});
  }
};

const addReaction: RequestHandler = async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    let reactMessage = await Message.updateOne(
      { _id: messageId },
      { $set: { reactEmoji: emoji } }
    );
    if (reactMessage.modifiedCount === 1) {
      res.status(200).send({ success: true, message: "Reacted to message" });
    } else {
      res.status(200).send({ success: false, message: "Something went wrong" });
    }
  } catch (err:any) {
    res.status(500).send({ success:false , message:err.message});
  }
};

const removeReaction: RequestHandler = async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    let reactMessage = await Message.updateOne(
      { _id: messageId },
      { $set: { reactEmoji: "" } }
    );
    if (reactMessage.modifiedCount === 1) {
      res
        .status(200)
        .send({ success: true, message: "Reacted from message removed" });
    } else {
      res.status(200).send({ success: false, message: "Something went wrong" });
    }
  } catch (err:any) {
    res.status(500).send({ success:false , message:err.message});
  }
};

const deleteMessage: RequestHandler = async (req, res) => {
  try {
    const { messageId } = req.body;
  
    let removeMessage = await Message.deleteOne({
      $or: [
        { messageId:messageId},
        {messageKey:messageId}
      ]
    });    
    if (removeMessage.deletedCount === 1) {
      res.status(200).send({ success: true, message: "Message deleted" });
    } else {
      res.status(400).send({
        success: true,
        message: "Something went wrong while deleting the message",
      });
    }
  } catch (err:any) {
    console.log(err)
    res.status(500).send({ success:false , message:err.message});
  }
};

const addEventAlertMessage: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;
    const { chatId, sender, message, msgType, moderator, user } = req.body;

    const newMessage = new Message({
      sender: process.env.MSG_BOT_ID,
      msgType: msgType,
      message: message,
      moderator: moderator,
      user: user,
    });

    await newMessage.save();

    let updateLatestMessage = await Chat.updateOne(
      { _id: chatId },
      { $set: { latestMessage: newMessage._id } }
    );
    let updateChat = await Chat.updateOne(
      { _id: chatId },
      { $push: { messages: newMessage._id } }
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
        )
      }
    }

    if (
      updateChat.modifiedCount === 1 &&
      updateLatestMessage.modifiedCount === 1
    ) {
      res.status(200).send({ success: true, message: "Alert message added" });
    } else {
      res
        .status(400)
        .send({
          success: false,
          message: "Something went wrong while adding alert message",
        });
    }
  } catch (err:any) {
    res.status(500).send({ success:false , message:err.message});
  }
};

export default {
  addMessage,
  addReaction,
  removeReaction,
  deleteMessage,
  addEventAlertMessage,
};
