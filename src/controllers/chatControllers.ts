import e, { RequestHandler, Request } from "express";
import Chat from "../models/chatModel";
import User from "../models/userMode";
import cloudinary from "cloudinary";
import Message from "../models/messageModel";
import mongoose, { model } from "mongoose";

const getSingleChat: RequestHandler = async (req, res) => {
  try {
    const { chatId, userOne, userTwo } = req.query as {
      chatId: string;
      userOne: string;
      userTwo: string;
    };
    let chat: any;

    if (userOne && userTwo) {
      const isChatAlreadyExists = await Chat.findOne({
        users: { $all: [userOne, userTwo], $size: 2 },
        isGroupChat: false,
      });

      if (isChatAlreadyExists?._id) {
        chat = isChatAlreadyExists;
      } else {
        const newChat = new Chat({
          isGroupChat: false,
          admins: [],
          users: [userOne, userTwo],
          messages: [],
        });
        await newChat.save();
        chat = newChat;
      }
    }

    if (chatId) {
      chat = await Chat.findOne({ _id: chatId });
    }

    if (chat) {
      await chat
        // @ts-ignore
        .populate([
          {
            path: "users",
            model: "user",
            select:
              "_id image name username email slogan createdAt blockedUsers lastSeen",
          },
          {
            path: "latestMessage",
            model: "message",
            select: "_id sender seenBy",
          },
          {
            path: "messages",
            options: { limit: 25, sort: { createdAt: -1 } },
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
                select: "_id image name username",
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
          },
        ]);
    }

    const totalMessages = await Message.countDocuments({ chat: chatId });

    res.status(200).send({
      success: true,
      message: "Chat fetched successfully",
      chat: chat,
      totalMessagesCount: totalMessages,
      isMore: totalMessages > 25,
    });
  } catch (err: any) {
    res.status(500).send(err);
  }
};

const isChatExists: RequestHandler = async (req, res) => {
  try {
    const { userOne, userTwo } = req.query;

    const getChat = await Chat.findOne({
      users: { $all: [userOne, userTwo] },
      isGroupChat: false,
    })
      .populate({
        path: "users",
        select: "_id image name email username discription slogan createdAt",
      })
      .populate({
        path: "messages",
        options: { limit: 25, sort: { createdAt: -1 } },
        populate: [
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
      })
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          model: "user",
          select: "_id image name email discription slogan createdAt",
        },
      });

    if (getChat) {
      res.status(200).send({
        success: true,
        message: "Chat fetched successfully",
        chat: getChat,
      });
    } else {
      let createNewChat = new Chat({
        isGroupChat: false,
        admins: [],
        users: [userOne, userTwo],
        messages: [],
      });

      await createNewChat.save();

      const getNewChat = await Chat.findOne({ _id: createNewChat._id })
        .populate({
          path: "users",
          select: "_id image name email discription slogan createdAt username",
        })
        .populate({
          path: "messages",
          populate: {
            path: "sender",
            model: "user",
            select: "_id image name email discription slogan createdAt",
          },
        })
        .populate({
          path: "latestMessage",
          populate: {
            path: "sender",
            model: "user",
            select: "_id image name email discription slogan createdAt",
          },
        });

      if (createNewChat._id) {
        res.status(201).send({
          success: true,
          message: "New chat created",
          chat: getNewChat,
        });
      } else {
        res.status(404).send({
          success: false,
          message: "Chat not found!",
          chat: {},
        });
      }
    }
  } catch (err: any) {
    res.status(500).send(err);
  }
};

const getAllUserChats: RequestHandler = async (req, res) => {
  try {
    const userId = req.body.userId;

    const getChats = await Chat.find({
      $and: [
        {
          $or: [{ users: { $in: userId } }, { "removedUsers._id": userId }],
        },
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
        populate: [
          {
            path: "sender",
            model: "user",
            select: "_id image username name email",
          },
          {
            path: "seenBy",
            model: "user",
            select: "_id username",
          },
        ],
      })
      .populate({
        path: "messages",
        model: "message",
        select: "_id seenBy deletedFor ",
        populate: { path: "seenBy", select: "_id username", model: "user" },
      })
      .select("-chatClearedFor -__v -chatDeleteFor")
      .sort({ updatedAt: -1 })
      .limit(15);

    const totalDocuments = await Chat.countDocuments({
      $and: [
        {
          $or: [{ users: { $in: userId } }, { "removedUsers._id": userId }],
        },
      ],
    });

    if (getChats.length > 0) {
      res.status(200).send({
        success: true,
        message: "Chats fetched successfully",
        chats: getChats,
        isMore: totalDocuments > 15,
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

    const result = await cloudinary.v2.uploader.upload(image, {
      folder: "Chat-app/Profile-pic",
      format: "webp",
      transformation: {
        quality: 80,
        fetch_format: "webp",
      },
    });

    const newGroupChat = new Chat({
      isGroupChat: true,
      admins: [userId],
      users: JSON.parse(users),
      createdBy: userId,
      name: groupName,
      image: result.secure_url,
      description: description,
    });

    await newGroupChat.save();

    const addAlertMessage = new Message({
      sender: process.env.MSG_BOT_ID,
      msgType: "alert",
      message: `created chat "${groupName}"`,
      moderator: moderator,
      user: null,
    });

    await addAlertMessage.save();

    await newGroupChat.updateOne({
      $push: { messages: addAlertMessage._id },
      $set: { latestMessage: addAlertMessage._id },
    });

    const chat = await Chat.findOne({ _id: newGroupChat._id })
      .populate({
        path: "users",
        model: "user",
        select: "_id name image username",
      })
      .populate("latestMessage")
      .populate({
        path: "messages",
        model: "message",
        select: "_id seenBy deletedFor ",
        populate: { path: "seenBy", select: "_id username", model: "user" },
      })
      .select("-removedUsers -__v");

    res.status(201).send({
      success: false,
      message: "New group chat created successfully",
      newChat: chat,
      groupInfo: {
        _id: newGroupChat._id,
        name: groupName,
      },
      createdBy: moderator,
      chatMsg: "created group",
    });
  } catch (err: any) {
    res.status(500).send(err);
  }
};

const addAdmin: RequestHandler = async (req, res) => {
  try {
    const { adminId, chatId, userId } = req.body;

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
    const { adminId, chatId, userId } = req.body;

    const findChat = await Chat.findOne({ _id: chatId });
    if (!findChat) {
      return res.status(404).send({ success: false, message: "No chat found" });
    }

    if (findChat.createdBy === adminId)
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
        message: "admin removed successfully",
        chatMsg: `removed`,
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const deleteChat: RequestHandler = async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const userDetails = {
      _id: userId,
      createdAt: new Date().toISOString(),
    };

    const isUserAlreadyInDeletedArray: any = await Chat.findOne({
      _id: chatId,
      "chatDeletedFor._id": userId,
    });

    const isUserAlreadyInClearedArray = await Chat.findOne({
      _id: chatId,
      "chatClearedFor._id": userId,
    });

    if (isUserAlreadyInClearedArray) {
      await Chat.updateOne(
        { _id: chatId, "chatClearedFor._id": userId },
        { $set: { "chatClearedFor.$.createdAt": new Date().toISOString() } }
      );
    } else {
      await Chat.updateOne(
        { _id: chatId },
        { $push: { chatClearedFor: userDetails } }
      );
    }

    if (isUserAlreadyInDeletedArray) {
      await Chat.updateOne(
        { _id: chatId, "chatDeletedFor._id": userId },
        { $set: { "chatDeletedFor.$.createdAt": new Date().toISOString() } }
      );
    } else {
      await Chat.updateOne(
        { _id: chatId },
        { $push: { chatDeletedFor: userDetails } }
      );
    }

    res
      .status(200)
      .send({ success: true, message: "Chat deleted successfully" });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const addUser: RequestHandler = async (req, res) => {
  try {
    let updateChat;
    const { newUserId, chatId } = req.body;

    const isUserAlreadyUser = await Chat.find({
      _id: chatId,
      users: newUserId,
    });

    if (isUserAlreadyUser.length === 0) {
      updateChat = await Chat.findOneAndUpdate(
        { _id: chatId },
        {
          $push: { users: newUserId },
          $pull: { removedUsers: { _id: newUserId } },
        },
        { new: true }
      )
        .populate({
          path: "users",
          model: "user",
          select: "_id name image username blockedUsers",
        })
        .populate({
          path: "latestMessage",
          model: "message",
          populate: [
            {
              path: "sender",
              model: "user",
              select: "_id image username name email",
            },
            {
              path: "seenBy",
              model: "user",
              select: "_id username",
            },
          ],
        })
        .populate({
          path: "messages",
          model: "message",
          select: "_id seenBy deletedFor ",
          populate: { path: "seenBy", select: "_id username", model: "user" },
        })
        .select("-removedUsers -__v")
        .sort({ updatedAt: -1 });
    }

    res.status(200).send({
      success: true,
      message: "User added",

      newChat: updateChat,
    });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const removeUser: RequestHandler = async (req, res) => {
  try {
    const { newUserId, chatId } = req.body;

    const addUser = {
      _id: newUserId,
      createdAt: new Date().toISOString(),
    };

    const addToRemoved = await Chat.updateOne(
      { _id: chatId },
      {
        $push: { removedUsers: addUser },
        $pull: {
          admins: newUserId,
          users: newUserId,
        },
      }
    );

    if (addToRemoved.modifiedCount === 1) {
      res.status(200).json({
        success: true,
        message: "User removed",
        chatMsg: `removed`,
      });
    } else {
      res.status(400).send({
        success: false,
        message: "Something went wrong while removing the user",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const clearChat: RequestHandler = async (req, res) => {
  try {
    const { chatId, userId } = req.body;
    const userDetails = {
      _id: userId,
      createdAt: new Date().toISOString(),
    };

    const findUser: any = await Chat.findOne({
      _id: chatId,
      "chatClearedFor._id": userId,
    });

    if (findUser) {
      await Chat.updateOne(
        { _id: chatId, "chatClearedFor._id": userId },
        { $set: { "chatClearedFor.$.createdAt": new Date().toISOString() } }
      );
    } else {
      await Chat.updateOne(
        { _id: chatId },
        { $push: { chatClearedFor: userDetails } }
      );
    }

    res
      .status(200)
      .send({ success: true, message: "Chat cleared successfully" });
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const leaveChat: RequestHandler = async (req, res) => {
  try {
    const { userId, chatId } = req.body;

    const addUser = {
      _id: userId,
      createdAt: new Date().toISOString(),
    };

    const addToRemoved = await Chat.updateOne(
      { _id: chatId },
      { $push: { removedUsers: addUser } }
    );

    const isRemovedUserAdmin = await Chat.findOne({
      _id: chatId,
      admins: userId,
    });

    if (isRemovedUserAdmin) {
      await isRemovedUserAdmin.updateOne({ $pull: { admins: userId } });
    }

    const removedUser = await User.findOne({ _id: userId }).select(
      "_id name createdAt"
    );

    if (addToRemoved.modifiedCount === 1) {
      res.status(200).send({
        success: true,
        message: "User removed",
        chatMsg: `left`,
        moderator: removedUser,
      });
    } else {
      res.status(400).send({
        success: false,
        message: "Something went wrong while removing the user",
      });
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const updateProfileInfo: RequestHandler = async (req, res) => {
  try {
    const { discription, slogan, name, chatType, id, isImgUpdated } = req.body;
    let newData;

    if (chatType === "group") {
      if (isImgUpdated) {
        newData = {
          discription: discription,
          name: name,
          image: req.body.newImage,
        };
      } else {
        newData = {
          discription: discription,
          name: name,
        };
      }

      let updateChat = await Chat.findOneAndUpdate(
        { _id: id },
        { $set: newData },
        { new: true }
      )
        .populate("users")
        .populate({
          path: "messages",
          populate: {
            path: "sender",
            model: "user",
            select: "_id image name email discription slogan",
          },
        })
        .populate({
          path: "latestMessage",
          populate: {
            path: "sender",
            model: "user",
            select: "_id image name email discription slogan",
          },
        });

      if (updateChat) {
        res.status(200).send({
          success: true,
          message: "Group chat updated successfully",
          newData: updateChat,
        });
      } else {
        res.status(400).send({
          success: false,
          message: "Something went wrong while updating the group chat",
        });
      }
    } else {
      if (isImgUpdated) {
        newData = {
          discription: discription,
          name: name,
          slogan: slogan,
          image: req.body.newImage,
        };
      } else {
        newData = {
          discription: discription,
          name: name,
          slogan: slogan,
        };
      }

      const updateUserInfo = await User.findOneAndUpdate(
        { _id: id },
        { $set: newData },
        { new: true }
      ).select("_id image name email discription slogan");

      if (updateUserInfo) {
        res.status(200).send({
          success: true,
          message: "User info updated successfully",
          newData: updateUserInfo,
        });
      } else {
        res.status(400).send({
          success: false,
          message: "Something went wrong while updating user info",
        });
      }
    }
  } catch (err: any) {
    res.status(500).send({ success: false, message: err.message });
  }
};

const changeChatTheme: RequestHandler = async (req, res) => {
  try {
    const { themeDetails, file_url, chatId } = req.body;

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
    const getChats = await Chat.find({
      $and: [
        {
          $or: [{ users: { $in: userId } }, { "removedUsers._id": userId }],
        },
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
        populate: [
          {
            path: "sender",
            model: "user",
            select: "_id image username name email",
          },
          {
            path: "seenBy",
            model: "user",
            select: "_id username",
          },
        ],
      })
      .populate({
        path: "messages",
        model: "message",
        select: "_id seenBy deletedFor ",
        populate: { path: "seenBy", select: "_id username", model: "user" },
      })
      .select("-chatClearedFor -__v -chatDeleteFor")
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(15);

    const totalDocuments = await Chat.countDocuments({
      $and: [
        {
          $or: [{ users: { $in: userId } }, { "removedUsers._id": userId }],
        },
      ],
    });

    res.status(200).send({
      success: true,
      message: "More chats fetched successfully",
      isMore: totalDocuments > offset + 15,
      totalDocuments: totalDocuments,
      chats: getChats,
    });
  } catch (err: any) {
    res.status(500).send(err.message);
  }
};

export default {
  getAllUserChats,
  createGroupChat,
  addAdmin,
  removeAdmin,
  deleteChat,
  addUser,
  removeUser,
  clearChat,
  getSingleChat,
  leaveChat,
  updateProfileInfo,
  isChatExists,
  changeChatTheme,
  loadMoreChats,
};
