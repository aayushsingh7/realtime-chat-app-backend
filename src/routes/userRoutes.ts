import express from "express";
import userControllers from "../controllers/userController";
import userAuthentication from "../middleware/userAuthentication";
import uploadFiles from "../middleware/uploadFiles";

const router = express.Router();

router.get("/users/search", userAuthentication, userControllers.searchUsers);
router.patch("/users/me", userAuthentication, uploadFiles, userControllers.updateProfile);
router.post("/users/:id/block", userAuthentication, userControllers.blockUser);
router.delete("/users/:id/block", userAuthentication, userControllers.unBlockUser);

export default router;
