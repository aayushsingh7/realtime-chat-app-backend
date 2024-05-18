import express from "express";
const userRoutes = express.Router();
import userControllers from "../controllers/userControllers";
import userAuthentication from "../middleware/userAuthentication";
import uploadFiles from "../middleware/uploadFiles";

userRoutes.put("/block-user", userAuthentication, userControllers.blockUser);
userRoutes.put("/unblock-user", userAuthentication, userControllers.unBlockUser);
userRoutes.post("/register", userControllers.register);
userRoutes.post("/login", userControllers.login);
userRoutes.get("/searchUsers", userAuthentication, userControllers.searchUsers);
userRoutes.get(
  "/authenticate",
  userAuthentication,
  userControllers.getLoggedInUser
);
userRoutes.get("/logout", userControllers.logoutUser);
userRoutes.put(
  "/user/update-profile",
  uploadFiles,
  userAuthentication,
  userControllers.updateProfile
);

export default userRoutes;
