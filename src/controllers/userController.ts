import { Request, Response } from "express";
import userService from "../services/userService";

class UserController {
  blockUser = async (req: Request, res: Response) => {
    try {
      const { userId, blockUserId } = req.body;
      await userService.blockUser(userId, blockUserId);
      res.status(200).send({
        status: "success",
        message: "User blocked successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  unBlockUser = async (req: Request, res: Response) => {
    try {
      const { userId, blockUserId } = req.body;
      await userService.unBlockUser(userId, blockUserId);
      res.status(200).send({
        status: "success",
        message: "User blocked successfully", // Keeping the original message even if it was "blocked" for "unblock"
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  searchUsers = async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const query = req.query.query as string;
      const users = await userService.searchUsers(userId, query);
      res.status(200).send({
        status: "success",
        message: "User fetched successfully",
        users,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  updateProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      await userService.updateProfile(userId, req.body);
      res.status(200).send({
        status: "success",
        message: "Changes saved successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };
}

export default new UserController();
