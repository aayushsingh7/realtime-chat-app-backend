import express from "express";
import chatControllers from "../controllers/chatController";
import userAuthentication from "../middleware/userAuthentication";
import profileImageUpload from "../middleware/profileImageUpload";
import uploadFiles from "../middleware/uploadFiles";

const router = express.Router();

router.get("/chats", userAuthentication, chatControllers.getUserChats);
router.post("/chats", userAuthentication, chatControllers.createOrGetChat);
router.get("/chats/load-more", userAuthentication, chatControllers.loadMoreChats);
router.put("/chats/:id/clear-or-delete", userAuthentication, chatControllers.clearOrDeleteChat);
router.put("/chats/:id/theme", userAuthentication, uploadFiles, chatControllers.changeChatTheme);
router.put("/chats/:id/info", userAuthentication, profileImageUpload, chatControllers.updateChatInfo);

router.post("/groups", userAuthentication, chatControllers.createGroupChat);
router.put("/groups/:id/users/add", userAuthentication, chatControllers.addUser);
router.put("/groups/:id/users/remove", userAuthentication, chatControllers.removeUser);
router.put("/groups/:id/admins/promote", userAuthentication, chatControllers.addAdmin);
router.put("/groups/:id/admins/demote", userAuthentication, chatControllers.removeAdmin);
router.put("/groups/:id/leave", userAuthentication, chatControllers.leaveChat);

export default router;
