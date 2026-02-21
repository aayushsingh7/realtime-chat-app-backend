import { Request, Response } from "express";
import statusService from "../services/statusService";

class StatusController {
  getStatus = async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const status = await statusService.getStatus(userId);
      res.status(200).send({
        status: "success",
        message: "Status fetched successfully",
        data: status,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  addStatus = async (req: Request, res: Response) => {
    try {
      const newStatus = await statusService.addStatus(req.body);
      res.status(201).send({
        status: "success",
        message: "New status added successfully",
        data: newStatus,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  statusSeen = async (req: Request, res: Response) => {
    try {
      const { userId, statusId } = req.body;
      await statusService.statusSeen(userId, statusId);
      res.status(200).send({
        status: "success",
        message: "Success",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };

  removeStatus = async (req: Request, res: Response) => {
    try {
      const { statusId } = req.body;
      await statusService.removeStatus(statusId);
      res.status(200).send({
        status: "success",
        message: "Status deleted successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).send({
        status: "error",
        message: err.message,
      });
    }
  };
}

export default new StatusController();
