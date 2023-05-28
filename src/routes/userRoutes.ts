import express from 'express'
const userRoutes = express.Router()
import userControllers from '../controllers/userControllers';
import userAuthentication from '../middleware/userAuthentication';

userRoutes.put("/blockuser",userAuthentication,userControllers.blockUser)
userRoutes.put("/unblock",userAuthentication,userControllers.unBlockUser)
userRoutes.post('/register',userControllers.register)
userRoutes.post('/login',userControllers.login)
userRoutes.get('/searchUsers',userAuthentication,userControllers.searchUsers)
userRoutes.get("/checkUser",userAuthentication,userControllers.getLoggedInUser)
userRoutes.get("/logout",userControllers.logoutUser)


export default userRoutes;