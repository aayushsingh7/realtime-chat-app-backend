import express from "express";
import chatController from "../controllers/chatController";
import userAuthentication from "../middleware/userAuthentication";
import profileImageUpload from "../middleware/profileImageUpload";
import uploadFiles from "../middleware/uploadFiles";

const router = express.Router();

router.get("/chats", userAuthentication, chatController.getUserChats);
router.post("/chats", userAuthentication, chatController.createOrGetChat);
router.get("/chats/load-more", userAuthentication, chatController.loadMoreChats);
router.put("/chats/:id/clear-or-delete", userAuthentication, chatController.clearOrDeleteChat);
router.put("/chats/:id/theme", userAuthentication, uploadFiles, chatController.changeChatTheme);
router.put("/chats/:id/info", userAuthentication, profileImageUpload, chatController.updateChatInfo);
router.patch("/chats/last-seen-bulk", userAuthentication, chatController.lastSeenMessage); 

router.post("/groups", userAuthentication, chatController.createGroupChat);
router.put("/groups/:id/users/add", userAuthentication, chatController.addUser);
router.put("/groups/:id/users/remove", userAuthentication, chatController.removeUser);
router.put("/groups/:id/admins/promote", userAuthentication, chatController.addAdmin);
router.put("/groups/:id/admins/demote", userAuthentication, chatController.removeAdmin);
router.put("/groups/:id/leave", userAuthentication, chatController.leaveChat);

export default router;
