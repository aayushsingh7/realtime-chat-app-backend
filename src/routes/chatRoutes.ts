import express from 'express'
const chatRoutes = express.Router()
import chatControllers from '../controllers/chatControllers'
import userAuthentication from '../middleware/userAuthentication'
import cookieParser from 'cookie-parser'
import handleFileUpload from '../middleware/handleFileUploads'
import editProfileImage from '../middleware/editProfileImage'
chatRoutes.use(cookieParser())

chatRoutes.put("/clear-chat",chatControllers.clearChat)
chatRoutes.get("/getAllChats",userAuthentication,chatControllers.getAllUserChats)
chatRoutes.get('/getChat',userAuthentication, chatControllers.getSingleChat)
chatRoutes.post('/create-new-group-chat',userAuthentication,handleFileUpload,chatControllers.createGroupChat)
chatRoutes.put("/remove-user-from-group",userAuthentication,chatControllers.removeUser)
chatRoutes.put("/add-user-to-group",userAuthentication,chatControllers.addUser)
chatRoutes.put("/add-admin",userAuthentication,chatControllers.addAdmin)
chatRoutes.put("/remove-admin",userAuthentication,chatControllers.removeAdmin)
chatRoutes.put("/clear-chat",userAuthentication,chatControllers.clearChat)
chatRoutes.put("/delete-chat",userAuthentication,chatControllers.deleteChat)
chatRoutes.put("/leave-group",userAuthentication,chatControllers.leaveChat)
chatRoutes.put("/update-info",userAuthentication,editProfileImage,chatControllers.updateProfileInfo)
chatRoutes.put("/isChatExists",userAuthentication,chatControllers.getSingelChatWithUsers)

export default chatRoutes