import mongoose from "mongoose";


const userModel = new mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    image:{type:String,default:"https://i.pinimg.com/474x/ec/e2/b0/ece2b0f541d47e4078aef33ffd22777e.jpg"},
    blockedUsers:[{type:mongoose.Schema.Types.ObjectId,ref:"user" , default:[]}],
    onlineStatus:{type:Boolean , default:false},
    lastOneline:{type:Date , default:new Date().toISOString()},
    discription:{type:String,default:""},
    role:{type:String,default:"user"},
    username:{type:String,default:""},
    slogan:{type:String,default:"Hey there! i am using ChatBox."}
},{timestamps:true})

const User = mongoose.model("user",userModel)

export default User;