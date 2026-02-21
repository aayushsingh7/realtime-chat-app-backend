import { Request, Response } from "express";
import messageService from "../services/messageService";

class MessageController {
  addMessage = async (req: Request, res: Response) => {
    try {
      const newMessage = await messageService.addMessage(req.body);
      res.status(200).send({
        status: "success",
        message: "New message added",
        newMessage,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  addReaction = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { userId, emoji } = req.body;
      await messageService.addReaction(id, userId, emoji);
      res.status(200).send({
        status: "success",
        message: "Reacted to message",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  removeReaction = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { userId } = req.body;
      await messageService.removeReaction(id, userId);
      res.status(200).send({
        status: "success",
        message: "Reacted from message removed",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  deleteMessages = async (req: Request, res: Response) => {
    try {
      const { messageIds, chatId } = req.body;
      await messageService.deleteMessages(messageIds, chatId);
      res.status(200).send({
        status: "success",
        message: "Message deleted",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  addEventAlertMessage = async (req: Request, res: Response) => {
    try {
      const alertMessage = await messageService.addEventAlertMessage(req.body);
      res.status(200).send({
        status: "success",
        message: "Alert message added",
        alertMessage,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  messages = async (req: Request, res: Response) => {
    try {
      const offset = Number(req.query.offset);
      const chatId = req.query.chatId as string;
      const userId = req.body.userId;
      const result = await messageService.getMessages(chatId, offset, userId);
      res.status(200).send({
        status: "success",
        message: "Messages fetched successfully",
        messages: result.messages,
        isMore: result.isMore,
        participants: result.participants,
        user: userId,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  getStarredMessages = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const messages = await messageService.getStarredMessages(userId);
      res.status(200).send({
        status: "success",
        message: "Starred messages fetched sucessfully",
        messages,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  addToStarredMessages = async (req: Request, res: Response) => {
    try {
      const { messageIds, userId } = req.body;
      await messageService.addToStarredMessages(messageIds, userId);
      res.status(200).send({
        status: "success",
        message: "Message(s) added to starred messages",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  removeFromStarredMessages = async (req: Request, res: Response) => {
    try {
      const { messageIds, userId } = req.body;
      await messageService.removeFromStarredMessages(messageIds, userId);
      res.status(200).send({
        status: "success",
        message: "Message(s) removed from starred messages",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  searchStarredMessages = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const query = req.query.query as string;
      const messages = await messageService.searchStarredMessages(userId, query);
      res.status(200).send({
        status: "success",
        message: "Starred messages fetched sucessfully",
        messages,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };
}

export default new MessageController();
