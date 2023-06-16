import e, { RequestHandler, Request } from "express";
import Chat from "../models/chatModel";
import User from "../models/userMode";
import Message from "../models/messageModel";
import cloudinary from 'cloudinary'

interface CustomReq extends Request {
  userId: string;
  cloudinary_file_link: string;
}

interface GroupChat {
  isGroupChat: boolean;
  admins: string[];
  users: string[];
  createdBy: string;
  name: string;
}

const getSingleChat: RequestHandler = async (req, res) => {
  try {
    const { chatId } = req.query as { chatId: string };

    const getChat = await Chat.findOne({ _id: chatId })
      .populate({
        path: "users",
        select: "_id image name email discription slogan createdAt",
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

    res.status(200).send({
      success: true,
      message: "Chat fetched successfully",
      chat: getChat,
    });
  } catch (err:any) {
    res.status(500).send(err);
  }
};

const getSingelChatWithUsers: RequestHandler = async (req, res) => {
  try {
    const { userOne, userTwo } = req.query;

    const getChat = await Chat.findOne({
      users: { $all: [userOne, userTwo] },
      isGroupChat: false,
    })    
      .populate({
        path: "users",
        select: "_id image name email discription slogan createdAt",
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

    if (getChat) {
      res.status(200).send({
        success: true,
        message: "Chat fetched successfully",
        chat: getChat,
      });
    } else {
      res.status(404).send({
        success: false,
        message: "Chat not found!",
        chat: {},
      });
    }
  } catch (err:any) {
    res.status(500).send(err);
  }
};

const getAllUserChats: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;
    const getChats = await Chat.find({ users: { $in: customReq.userId } })
      .populate({
        path: "users",
        select: "_id image name email discription slogan createdAt",
      })
      .populate({
        path: "messages",
        populate: [
          {
            path: "sender",
            model: "user",
            select: "_id image name email discription slogan createdAt",
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
      })
      .sort({ updatedAt: -1 });

    if (getChats.length > 0) {
      res.status(200).send({
        success: true,
        message: "Chats fetched successfully",
        data: getChats,
      });
    } else {
      res
        .status(404)
        .send({ success: false, message: "No Chats Found", data: [] });
    }
  } catch (err:any) {
    res.status(500).send(err);
  }
};

const createGroupChat: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;

    const { users, groupName, discription } = req.body;

    const getAdmin = await User.findOne({ _id: customReq.userId });

    const newGroupChat = new Chat({
      isGroupChat: true,
      admins: [customReq.userId], // the user who created the group will be default admin
      users: JSON.parse(users),
      createdBy: customReq.userId,
      name: groupName,
      image: customReq.cloudinary_file_link,
      discription: discription,
    });

    await (
      await (
        await (await newGroupChat.save()).populate("users")
      ).populate({
        path: "messages",
        populate: {
          path: "sender",
          model: "user",
          select: "_id image name email discription slogan",
        },
      })
    ).populate({
      path: "latestMessage",
      populate: {
        path: "sender",
        model: "user",
        select: "_id image name email discription slogan",
      },
    });

    if (newGroupChat._id) {
      res.status(200).send({
        success: false,
        message: "New group chat created successfully",
        newChat: newGroupChat,
        groupName: {
          _id: newGroupChat._id,
          name: groupName,
        },
        createdBy: getAdmin,
        chatMsg: "created group",
      });
    } else {
      res.status(400).send({
        success: false,
        message: "Something went wrong while create new group chat",
      });
    }
  } catch (err:any) {
    res.status(500).send(err);
  }
};

const addAdmin: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;
    const { adminId, chatId } = req.body;

    const findChat = await Chat.findOne({ _id: chatId });
    if (!findChat) {
      return res.status(404).send({ success: false, message: "No chat found" });
    }

    const addAdmin = await findChat.updateOne({
      $push: { admins: adminId },
    });

    const addedAdmin = await User.findOne({ _id: adminId }).select(
      "_id name email"
    );
    const addedAdminBy = await User.findOne({ _id: customReq.userId }).select(
      "_id name email"
    );

    if (addAdmin.modifiedCount === 1) {
      res.status(200).send({
        success: true,
        message: "New admin added successfully",
        chatMsg: `${addedAdminBy?.name} added ${addedAdmin?.name}`,
        moderator: addedAdminBy,
        user: addedAdmin,
      });
    }
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
  }
};

const removeAdmin: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;
    const { adminId, chatId } = req.body;

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

    const removedAdmin = await User.findOne({ _id: adminId }).select(
      "_id name email"
    );
    const removedAdminBy = await User.findOne({ _id: customReq.userId }).select(
      "_id name email"
    );

    if (removeAdmin.modifiedCount === 1) {
      res.status(200).send({
        success: true,
        message: "admin removed successfully",
        chatMsg: `removed`,
        moderator: removedAdminBy,
        user: removedAdmin,
      });
    }
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
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
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
  }
};

const addUser: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;
    let updateChat;
    const { userId, chatId } = req.body;

    const isUserAlreadyUser = await Chat.find({ _id: chatId, users: userId });

    if (isUserAlreadyUser.length === 0) {
      updateChat = await Chat.updateOne(
        { _id: chatId },
        { $push: { users: userId } }
      );
    }

    const isUserInRemoved = await Chat.findOne({
      _id: chatId,
      "removedUsers._id": userId,
    });

    if (isUserInRemoved) {
      let removeUser = await Chat.updateOne(
        { _id: chatId, "removedUsers._id": userId },
        { $pull: { removedUsers: { _id: userId } } }
      );
    }

    const addedUser = await User.findOne({ _id: userId }).select(
      "_id name email"
    );
    const addedBy = await User.findOne({ _id: customReq.userId }).select(
      "_id name email"
    );

    res.status(200).send({
      success: true,
      message: "User added",
      chatMsg: `added`,
      moderator: addedBy,
      user: addedUser,
    });
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
  }
};

const removeUser: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;

    const { userId, chatId } = req.body;

    const removedUser = await User.findOne({ _id: userId }).select(
      "_id name email createdAt"
    );
    const removedBy = await User.findOne({ _id: customReq.userId }).select(
      "_id name email createdAt"
    );

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

    if (addToRemoved.modifiedCount === 1) {
      res.status(200).json({
        success: true,
        message: "User removed",
        chatMsg: `removed`,
        data: {
          moderator: removedBy,
          user: removedUser,
        },
      });
    } else {
      res.status(400).send({
        success: false,
        message: "Something went wrong while removing the user",
      });
    }
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
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
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
  }
};

const leaveChat: RequestHandler = async (req, res) => {
  try {
    const customReq = req as CustomReq;

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
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
  }
};

const updateProfileInfo: RequestHandler = async (req, res) => {
  try {
    let customReq = req as CustomReq;

    cloudinary.v2.config({
      cloud_name: process.env.CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const { discription, slogan, name, chatType, id,isImgUpdated,image } = req.body;
    let newData;

    

    if (chatType === "group") {
      if (isImgUpdated) {
        let result = await cloudinary.v2.uploader.upload(image)
        newData = {
          discription: discription,
          name: name,
          image:result.secure_url,
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
        let result = await cloudinary.v2.uploader.upload(image)
        newData = {
          discription: discription,
          name: name,
          slogan: slogan,
          image:result.secure_url,
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
  } catch (err:any) {
   res.status(500).send({ success:false , message:err.message});
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
  getSingelChatWithUsers,
};
