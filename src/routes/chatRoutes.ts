import express from "express";
const chatRoutes = express.Router();
import chatControllers from "../controllers/chatControllers";
import userAuthentication from "../middleware/userAuthentication";
import profileImageUpload from "../middleware/profileImageUpload";
import uploadFiles from "../middleware/uploadFiles";

chatRoutes.get("/chats", userAuthentication, chatControllers.getUserChats);
chatRoutes.post("/chats", userAuthentication, chatControllers.createOrGetChat);
chatRoutes.get("/chats/load-more", userAuthentication, chatControllers.loadMoreChats);
chatRoutes.put("/chats/:chatId/clear-or-delete", userAuthentication, chatControllers.clearOrDeleteChat);
chatRoutes.put("/chats/:chatId/theme", userAuthentication, uploadFiles, chatControllers.changeChatTheme);
chatRoutes.put("/chats/:chatId/info", userAuthentication, profileImageUpload, chatControllers.updateChatInfo);

chatRoutes.post("/groups", userAuthentication, chatControllers.createGroupChat);
chatRoutes.put("/groups/:chatId/users/add", userAuthentication, chatControllers.addUser);
chatRoutes.put("/groups/:chatId/users/remove", userAuthentication, chatControllers.removeUser);
chatRoutes.put("/groups/:chatId/admins/promote", userAuthentication, chatControllers.addAdmin);
chatRoutes.put("/groups/:chatId/admins/demote", userAuthentication, chatControllers.removeAdmin);
chatRoutes.put("/groups/:chatId/leave", userAuthentication, chatControllers.leaveChat);

export default chatRoutes;
