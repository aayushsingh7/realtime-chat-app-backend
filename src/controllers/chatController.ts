import { Request, Response } from "express";
import chatService from "../services/chatService";

class ChatController {
  createOrGetChat = async (req: Request, res: Response) => {
    try {
      const result = await chatService.createOrGetChat(req.body);
      res.status(200).send({
        status: "success",
        message: "Chat fetched successfully",
        chat: result.chat,
        participants: result.participants,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  getUserChats = async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const result = await chatService.getUserChats(userId);
      res.status(200).send({
        status: "success",
        message: "Chats fetched successfully",
        chats: result.chats,
        isMore: result.isMore,
        lastSeenMessagePerChat: result.lastSeenMessagePerChat,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  createGroupChat = async (req: Request, res: Response) => {
    try {
      const result = await chatService.createGroupChat(req.body);
      res.status(201).send({
        status: "success",
        message: "New group chat created successfully",
        newChat: result.newChat,
        groupInfo: result.groupInfo,
        createdBy: result.createdBy,
        chatMsg: result.chatMsg,
        addAlertMessage: result.addAlertMessage,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  addAdmin = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const adminId = req.body.adminId;
      await chatService.addAdmin(chatId, adminId);
      res.status(200).send({
        status: "success",
        message: "New admin added successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  removeAdmin = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const adminId = req.body.adminId;
      await chatService.removeAdmin(chatId, adminId);
      res.status(200).send({
        status: "success",
        message: "Admin removed successfully",
        chatMsg: "removed",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  clearOrDeleteChat = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const { userId, type } = req.body;
      await chatService.clearOrDeleteChat(chatId, userId, type);
      res.status(200).send({
        status: "success",
        message: `Chat ${type == "delete" ? "delete" : "clear"} successfully`,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  addUser = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const newUserId = req.body.newUserId;
      const result = await chatService.addUser(chatId, newUserId);
      res.status(200).send({
        status: "success",
        message: "User added",
        newChat: result.newChat,
        newParticipant: result.newParticipant,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  removeUser = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const newUserId = req.body.newUserId;
      await chatService.removeUser(chatId, newUserId);
      res.status(200).send({
        status: "success",
        message: "User removed",
        chatMsg: "removed",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  leaveChat = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const { userId } = req.body;
      const removedUser = await chatService.leaveChat(chatId, userId);
      res.status(200).send({
        status: "success",
        message: "User left successfully",
        chatMsg: "left",
        moderator: removedUser,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  updateChatInfo = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const result = await chatService.updateChatInfo(chatId, req.body);
      res.status(200).send({
        status: "success",
        message: `${
          req.body.chatType === "group" ? "Group chat" : "User info"
        } updated successfully`,
        newData: result,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  changeChatTheme = async (req: Request, res: Response) => {
    try {
      const chatId = req.params.id;
      const theme = await chatService.changeChatTheme(chatId, req.body);
      res.status(200).send({
        status: "success",
        message: "Theme changed successfully",
        theme: theme,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  loadMoreChats = async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const offset = Number(req.query.offset);
      const result = await chatService.loadMoreChats(userId, offset);
      res.status(200).send({
        status: "success",
        message: "More chats fetched successfully",
        isMore: result.isMore,
        chats: result.chats,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  lastSeenMessage = async (req: Request, res: Response) => {
    try {
      const { lastSeenMessagePerChat, userId } = req.body;
      await chatService.lastSeenMessage(userId, lastSeenMessagePerChat);
      res.status(200).send({
        status: "success",
        message: "Updated successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };
}

export default new ChatController();
