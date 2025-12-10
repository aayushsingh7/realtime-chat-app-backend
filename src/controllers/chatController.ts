import cloudinary from "cloudinary";
import { RequestHandler } from "express";
import mongoose from "mongoose";
import Chat from "../models/chatModel";
import Message from "../models/messageModel";
import User from "../models/userModel";
import { ChatType } from "../types/types";
import ChatMember from "../models/chatMemberModel";

const getSanitizedChats = async (chats: any[], userId: string) => {
  if (!chats || !chats.length) return [];

  const chatIds = chats.map((c) => c._id);
  const slowestMembers = await ChatMember.aggregate([
    {
      $match: {
        chat: { $in: chatIds },
        user: { $ne: new mongoose.Types.ObjectId(userId) }, // Exclude ME
      },
    },
    { $sort: { lastSeenMessageId: 1 } },
    {
      $group: {
        _id: "$chat",
        slowestSeenId: { $first: "$lastSeenMessage" },
      },
    },
  ]);

  const slowestMap = new Map(
    slowestMembers.map((m) => [m._id.toString(), m.slowestSeenId])
  );

  return chats.map((originalChat) => {
    const chat = { ...originalChat };
    const slowestId =
      slowestMap.get(chat._id.toString()) || "000000000000000000000000";
    const isLatestMessageSeen =
      slowestId.toString() >= chat.latestMessage?._id.toString();

    console.log({ isLatestMessageSeen });

    const removalDate = chat.removedUsers?.[userId] || null;
    chat.isRemoved = {
      status: chat.isGroupChat && removalDate !== null,
      removedOn: removalDate,
    };
    delete chat.removedUsers;

    chat.isBlocked = false;
    if (!chat.isGroupChat && chat.users) {
      const otherUser = chat.users.find(
        (u: any) => u._id.toString() !== userId.toString()
      );
      if (otherUser?.blockedUsers) {
        chat.isBlocked = otherUser.blockedUsers.some(
          (id: string) => id.toString() === userId.toString()
        );
      }
    }

    if (chat.users) {
      chat.users = chat.users.map((user: any) => {
        const userCopy = { ...user };
        const isBlockingMe = userCopy.blockedUsers?.some(
          (id: string) => id.toString() === userId.toString()
        );

        if (isBlockingMe) {
          userCopy.image =
            "https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg";
        }
        delete userCopy.blockedUsers;
        return userCopy;
      });
    }

    return {
      ...chat,
      isLatestMessageSeen,
    };
  });
};

const createOrGetChat: RequestHandler = async (req, res) => {
  const { userOne, userTwo, chatId, isGroupChat, userId } = req.body;
  try {
    let chat;

    if (isGroupChat) {
      chat = await Chat.findOne({ _id: chatId }).select("-__v -removedUsers");
    } else {
      const pair = [userOne, userTwo].sort();
      chat = await Chat.findOneAndUpdate(
        {
          users: pair,
          isGroupChat: false,
        },
        {
          $setOnInsert: {
            isGroupChat: false,
            admins: [],
          },
        },
        {
          upsert: true,
          new: true,
        }
      ).select("-__v -removedUsers");
    }

    await chat?.populate({
      path: "users",
      model: "user",
      select: "_id image name email",
    });

    const otherUser = userId == userOne ? userTwo : userOne;
    const isBlocked = Boolean(
      await User.findOne({ _id: otherUser, blockedUsers: userId })
    );
    if (isBlocked && chat)
      chat.image =
        "https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg";

    const participants = [
      {
        chat: chat?._id,
        user: userOne,
        unreadCount: 0,
        lastSeenMessage: "000000000000000000000000",
      },
      {
        chat: chat?._id,
        user: userTwo,
        unreadCount: 0,
        lastSeenMessage: "000000000000000000000000",
      },
    ];

    await ChatMember.insertMany(participants);

    res.status(200).send({
      success: true,
      message: "Chat fetched successfully",
      chat: chat,
      participants,
    });

    // message queue
    // await ChatMember.insertMany(participants);
  } catch (err: any) {
    console.error(err);
    res.status(500).send({ success: false, message: err.message });
  }
};

const getUserChats: RequestHandler = async (req, res) => {
  try {
    const userId = req.body.userId;
    const limit = 15;

    const chats = await Chat.find({
      $or: [
        { users: userId },
        { [`removedUsers.${userId}`]: { $exists: true } },
      ],
    })
      .populate({
        path: "latestMessage",
        model: "message",
        populate: {
          path: "sender",
          model: "user",
          select: "_id username name",
        },
        select:
          "msgType message fileName document sender seenBy moderator users",
      })
      .populate({
        path: "users",
        model: "user",
        select: "_id image name username blockedUsers lastSeen email",
      })
      .select(
        "isGroupChat _id updatedAt image name latestMessage users theme removedUsers admins"
      )
      .sort({ updatedAt: -1 })
      .limit(limit + 1)
      .lean();

    const lastSeenMessagePerChatPromise = ChatMember.find({
      user: userId,
      chat: { $in: chats.map((chat: any) => chat._id) },
    });

    //@ts-ignore
    const sanitizedChatsPromise = getSanitizedChats(chats, userId);
    const isMore = chats.length > limit;

    const [lastSeenMessagePerChat, sanitizedChats] = await Promise.all([
      lastSeenMessagePerChatPromise,
      sanitizedChatsPromise,
    ]);
    // console.log({sanitizedChats})

    if (chats.length > 0) {
      res.status(200).send({
        success: true,
        message: "Chats fetched successfully",
        chats: sanitizedChats,
        isMore,
        lastSeenMessagePerChat,
      });
    } else {
      res
        .status(404)
        .send({ success: false, message: "No Chats Found", chats: [] });
    }
  } catch (err: any) {
    res.status(500).send(err);
  }
};

const createGroupChat: RequestHandler = async (req, res) => {
  try {
    const { users, groupName, description, image, moderator, userId } =
      req.body;

    const imageUploadPromise = cloudinary.v2.uploader.upload(image, {
      folder: "Chat-app/Profile-pic",
      format: "webp",
      transformation: { quality: 80, fetch_format: "webp" },
    });

    const newChatId = new mongoose.Types.ObjectId();
    const newMessageId = new mongoose.Types.ObjectId();

    const addAlertMessage = new Message({
      _id: newMessageId,
      sender: process.env.MSG_BOT_ID,
      msgType: "alert",
      message: `created chat "${groupName}"`,
      moderator: moderator,
      user: null,
      chat: newChatId,
    });

    const result = await imageUploadPromise;

    const newGroupChat = new Chat({
      _id: newChatId,
      isGroupChat: true,
      admins: [userId],
      users: JSON.parse(users),
      createdBy: userId,
      name: groupName,
      image: result.secure_url,
      description: description,
      latestMessage: newMessageId,
    });

    await Promise.all([newGroupChat.save(), addAlertMessage.save()]);

    const chat = await newGroupChat.populate([
      {
        path: "users",
        model: "user",
        select: "_id name image username",
      },
      {
        path: "latestMessage",
        model: "message",
        select: "msgType message fileName document moderator",
      },
    ]);

    res.status(201).send({
      success: true,
      message: "New group chat created successfully",
      newChat: chat,
      groupInfo: {
        _id: newGroupChat._id,
        name: groupName,
      },
      createdBy: moderator,
      chatMsg: "created group",
      addAlertMessage,
    });
  } catch (err: any) {
    console.error("Create Group Chat Error:", err);
    res.status(500).send({ success: false, message: err.message });
  }
};

const addAdmin: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const adminId = req.body.adminId;

    const findChat = await Chat.findOne({ _id: chatId });
    if (!findChat) {
      return res.status(404).send({ success: false, message: "No chat found" });
    }

    const addAdmin = await findChat.updateOne({
      $push: { admins: adminId },
    });

    if (addAdmin.modifiedCount === 1) {
      res.status(200).send({
        success: true,
        message: "New admin added successfully",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const removeAdmin: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const adminId = req.body.adminId;

    const findChat = await Chat.findOne({ _id: chatId }).select("createdBy");
    if (!findChat) {
      return res.status(404).send({ success: false, message: "No chat found" });
    }

    if (findChat.createdBy?.toString() === adminId)
      return res.status(400).send({
        success: false,
        message:
          "The person who has created the group cannot be removed from admin",
      });

    const removeAdmin = await findChat.updateOne({
      $pull: { admins: adminId },
    });

    if (removeAdmin.modifiedCount === 1) {
      res.status(200).send({
        success: true,
        message: "Admin removed successfully",
        chatMsg: "removed",
      });
    } else {
      res.status(400).send({
        success: false,
        message: "User was not an admin or already removed",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const clearOrDeleteChat: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const { userId, type } = req.body;
    let update;
    if (type == "delete") {
      update = await User.updateOne(
        { _id: userId },
        {
          $set: {
            [`deletedChats.${chatId}`]: new Date(),
          },
        }
      );
    } else {
      update = await User.updateOne(
        { _id: userId },
        {
          $set: {
            [`clearedChats.${chatId}`]: new Date(),
          },
        }
      );
    }

    if (update.acknowledged) {
      res.status(200).send({
        success: true,
        message: `Chat ${type == "delete" ? "delete" : "clear"} successfully`,
      });
    } else {
      res.status(400).send({
        success: false,
        message: `Cannot ${type == "delete" ? "delete" : "clear"} chat`,
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const addUser: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const newUserId = req.body.newUserId;

    const updateChat = await Chat.findOneAndUpdate(
      { _id: chatId },
      {
        $push: { users: newUserId },
        $unset: { [`removedUsers.${newUserId}`]: "" },
      },
      { new: true }
    )
      .populate({
        path: "users",
        model: "user",
        select: "_id name image username",
      })
      .populate({
        path: "latestMessage",
        model: "message",
        populate: {
          path: "sender",
          model: "user",
          select: "_id image username name email",
        },
        select: "msgType message sender seenBy moderator createdAt",
      })
      .select("-removedUsers -__v ")
      .lean();

    const newParticipantData = {
      chat: chatId,
      user: newUserId,
      unreadCount: 0,
      //@ts-ignore
      lastSeenMessage: updateChat?.latestMessage?.createdAt,
    };

    const newParticipant = await ChatMember.findOneAndUpdate(
      { chat: chatId, user: newUserId },
      newParticipantData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(200).send({
      success: true,
      message: "User added",
      newChat: updateChat,
      newParticipant,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const removeUser: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const newUserId = req.body.newUserId;

    const removeUserPromise = Chat.updateOne(
      { _id: chatId },
      {
        $set: { [`removedUsers.${newUserId}`]: new Date() },
        $pull: {
          admins: newUserId,
          users: newUserId,
        },
      }
    );

    const removeMemberPromise = ChatMember.deleteOne({
      chat: chatId,
      user: newUserId,
    });
    const [updatedResult] = await Promise.all([
      removeUserPromise,
      removeMemberPromise,
    ]);

    if (updatedResult.modifiedCount == 0) {
      res.status(400).send({
        success: false,
        message: "Something went wrong while removing the user",
      });
    }
    res.status(200).json({
      success: true,
      message: "User removed",
      chatMsg: `removed`,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const leaveChat: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const { userId } = req.body;
    const chatUpdatePromise = Chat.updateOne(
      { _id: chatId },
      {
        $set: { [`removedUsers.${userId}`]: new Date() },
        $pull: { users: userId, admins: userId },
      }
    );

    const memberDeletePromise = ChatMember.deleteOne({
      chat: chatId,
      user: userId,
    });

    const [updateResult] = await Promise.all([
      chatUpdatePromise,
      memberDeletePromise,
    ]);

    if (updateResult.modifiedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Chat not found or user already left",
      });
    }

    const removedUser = await User.findById(userId).select("_id name");

    res.status(200).send({
      success: true,
      message: "User left successfully",
      chatMsg: `left`,
      moderator: removedUser,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const updateChatInfo: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const { discription, slogan, name, chatType, isImgUpdated, newImage } =
      req.body;
    const updatePayload: any = {
      name,
      discription,
    };

    if (isImgUpdated) {
      updatePayload.image = newImage;
    }

    let updatedResult;
    if (chatType === "group") {
      updatedResult = await Chat.findByIdAndUpdate(
        chatId,
        { $set: updatePayload },
        { new: true }
      )
        .populate({
          path: "users",
          model: "user",
          select: "_id image email name",
        })
        .populate({
          path: "latestMessage",
          populate: {
            path: "sender",
            model: "user",
            select: "_id image name",
          },
        });
    } else {
      updatePayload.slogan = slogan;

      updatedResult = await User.findByIdAndUpdate(
        chatId,
        { $set: updatePayload },
        { new: true }
      ).select("_id image name email discription slogan");
    }

    if (!updatedResult) {
      return res.status(404).send({
        success: false,
        message: `${chatType === "group" ? "Group" : "User"} not found`,
      });
    }

    res.status(200).send({
      success: true,
      message: `${
        chatType === "group" ? "Group chat" : "User info"
      } updated successfully`,
      newData: updatedResult,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const changeChatTheme: RequestHandler = async (req, res) => {
  try {
    const chatId = req.params.id;
    const { themeDetails, file_url } = req.body;

    let theme;
    if (file_url) {
      theme = {
        URL: file_url,
        name: "custom",
      };
    } else {
      theme = themeDetails;
    }

    const updateChat = await Chat.updateOne(
      { _id: chatId },
      { $set: { theme: theme } }
    );

    res.status(200).send({
      success: true,
      message: "Theme changed successfully",
      theme: theme,
    });
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

const loadMoreChats: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.query;
    const offset = Number(req.query.offset);
    const limit = 15;
    const chats = await Chat.find({
      $or: [
        { users: userId },
        { [`removedUsers.${userId}`]: { $exists: true } },
      ],
    })
      .populate({
        path: "users",
        model: "user",
        select: "_id name image username blockedUsers",
      })
      .populate({
        path: "latestMessage",
        model: "message",
        populate: {
          path: "sender",
          model: "user",
          select: "_id image username name email",
        },
        select: "msgType message fileName document sender seenBy moderator",
      })
      .populate({
        path: "users",
        model: "user",
        select: "_id image name username blockedUsers",
      })
      .select("isGroupChat _id updatedAt image name latestMessage users")
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit + 1)
      .lean();

    //@ts-ignore
    const sanitizedChats = getSanitizedChats(chats, userId);
    const isMore = chats.length > limit;

    res.status(200).send({
      success: true,
      message: "More chats fetched successfully",
      isMore,
      chats: sanitizedChats,
    });
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

const lastSeenMessage: RequestHandler = async (req, res) => {
  try {
    const {lastSeenMessagePerChat, userId} = req.body;
    const updateMember = await ChatMember.bulkWrite(
      lastSeenMessagePerChat.map((c: any) => ({
        updateOne: {
          filter: { user: userId, chat:c[0] },
          update: { $set: { lastSeenMessage: c[1].lastSeenMessage, unreadCount:c[1].unreadCount } },
        },
      }))
    );
    if (updateMember.modifiedCount == 0) {
      res
        .status(404)
        .send({ success: false, message: "Chat member not found" });
    }
    res.status(200).send({ success: true, message: "Updated successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

export default {
  getUserChats,
  createGroupChat,
  addAdmin,
  removeAdmin,
  addUser,
  removeUser,
  clearOrDeleteChat,
  leaveChat,
  updateChatInfo,
  createOrGetChat,
  changeChatTheme,
  loadMoreChats,
  lastSeenMessage,
};
