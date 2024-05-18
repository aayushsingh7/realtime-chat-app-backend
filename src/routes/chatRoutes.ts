import express from "express";
const chatRoutes = express.Router();
import chatControllers from "../controllers/chatControllers";
import userAuthentication from "../middleware/userAuthentication";
import profileImageUpload from "../middleware/profileImageUpload";
import uploadFiles from "../middleware/uploadFiles";

chatRoutes.put("/clear-chat", chatControllers.clearChat);
chatRoutes.get("/chats", userAuthentication, chatControllers.getAllUserChats);
chatRoutes.get("/getChat", userAuthentication, chatControllers.getSingleChat);
chatRoutes.post(
  "/group-chat/create-new-group",
  userAuthentication,
  chatControllers.createGroupChat
);
chatRoutes.put(
  "/group-chat/remove-user",
  userAuthentication,
  chatControllers.removeUser
);
chatRoutes.put(
  "/group-chat/add-user",
  userAuthentication,
  chatControllers.addUser
);
chatRoutes.put(
  "/group-chat/promote-admin",
  userAuthentication,
  chatControllers.addAdmin
);
chatRoutes.put(
  "/group-chat/demote-admin",
  userAuthentication,
  chatControllers.removeAdmin
);
chatRoutes.put("/clear-chat", userAuthentication, chatControllers.clearChat);
chatRoutes.put("/delete-chat", userAuthentication, chatControllers.deleteChat);
chatRoutes.put(
  "/group-chat/leave-group",
  userAuthentication,
  chatControllers.leaveChat
);
chatRoutes.put(
  "/update-info",
  userAuthentication,
  profileImageUpload,
  chatControllers.updateProfileInfo
);
chatRoutes.put(
  "/isChatExists",
  userAuthentication,
  chatControllers.isChatExists
);
chatRoutes.put(
  "/change-theme",
  userAuthentication,
  uploadFiles,
  chatControllers.changeChatTheme
);
chatRoutes.get(
  "/load-more-chats",
  userAuthentication,
  chatControllers.loadMoreChats
);
export default chatRoutes;
