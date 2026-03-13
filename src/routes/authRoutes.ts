import { Router } from "express";
import userAuthentication from "../middleware/userAuthentication";
import AuthService from "../services/authService";
import User from "../models/userModel";
import AuthController from "../controllers/authController";

const authService = new AuthService(User);
const authController = new AuthController(authService);
const router = Router();

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logoutUser);
router.get("/auth/me", userAuthentication, authController.getLoggedInUser);

export default router;