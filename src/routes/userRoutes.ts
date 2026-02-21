import express from "express";
import userController from "../controllers/userController";
import userAuthentication from "../middleware/userAuthentication";
import uploadFiles from "../middleware/uploadFiles";

const router = express.Router();

router.get("/users/search", userAuthentication, userController.searchUsers);
router.patch("/users/me", userAuthentication, uploadFiles, userController.updateProfile);
router.post("/users/:id/block", userAuthentication, userController.blockUser);
router.delete("/users/:id/block", userAuthentication, userController.unBlockUser);

export default router;
                                                                                  