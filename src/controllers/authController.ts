import { Request, Response } from "express";
import authService from "../services/authService";

class AuthController {
  register = async (req: Request, res: Response) => {
    try {
      const { token } = await authService.register(req.body);

      res.cookie("chatverse", token, {
        httpOnly: true,
        secure: true,
        maxAge: 21 * 24 * 60 * 60 * 1000,
        sameSite: "none",
        path: "/",
      });

      res.status(200).send({
        status: "success",
        message: "User registered successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode).send({
        status: "error",
        message: err.message,
      });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { token } = await authService.login(req.body);

      res.cookie("chatverse", token, {
        httpOnly: true,
        secure: true,
        maxAge: 21 * 24 * 60 * 60 * 1000,
        sameSite: "none",
        path: "/",
      });

      res.status(200).send({
        status: "success",
        message: "User loggedin successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode).send({
        status: "error",
        message: err.message,
      });
    }
  };

  getLoggedInUser = async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;
      const user = await authService.getLoggedInUser(userId);

      res.status(200).send({
        status: "success",
        message: "User logged In",
        user: user,
      });
    } catch (err: any) {
      res.status(err.statusCode).send({
        status: "error",
        message: err.message,
      });
    }
  };

  logoutUser = async (req: Request, res: Response) => {
    try {
      res.clearCookie("chatverse", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.status(200).send({
        status: "success",
        message: "Logout successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode).send({
        status: "error",
        message: err.message,
      });
    }
  };
}

export default new AuthController();
