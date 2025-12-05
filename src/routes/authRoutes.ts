import { Router } from "express";
import authController from "../controllers/authController"
import userAuthentication from "../middleware/userAuthentication";

const router = Router()

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.post("/auth/logout", authController.logoutUser);
router.get("/auth/me", userAuthentication, authController.getLoggedInUser);

export default router;