import User from "../models/userModel";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import CustomError from "../utils/customError";

class AuthService {
  async register(userData: any) {
    const { username, email, password, name } = userData;
    const isUserExistsOnEmail = await User.findOne({ email: email });
    const isUserExistsOnUsername = await User.findOne({ username: username });

    if (isUserExistsOnEmail || isUserExistsOnUsername) {
      throw new CustomError(
        isUserExistsOnEmail
          ? "Username already taken, please choose another one."
          : "User already exists with the given email.",
        400
      );
    }

    const hashPassword = await bcryptjs.hash(password, 12);

    const newUser = new User({
      name: name,
      email: email,
      username: username,
      password: hashPassword,
    });

    await newUser.save();
    if (!newUser._id) {
      throw new CustomError("Something went wrong while registering user ", 400);
    }

    const token = await jwt.sign(
      { _id: newUser._id },
      `${process.env.SECRET_KEY}`
    );

    return { token, user: newUser };
  }

  async login(credentials: any) {
    const { email, password } = credentials;
    let isUserExists = await User.findOne({ email: email });
    if (!isUserExists) {
      throw new CustomError("Sorry, no registered uesr found with the given email", 404);
    }

    let verifyPassword = await bcryptjs.compare(password, isUserExists.password);

    if (!verifyPassword) {
      throw new CustomError(
        "Sorry, your password was incorrect. Please double-check your password.",
        400
      );
    }

    const token = await jwt.sign(
      { _id: isUserExists._id },
      `${process.env.SECRET_KEY}`
    );

    return { token, user: isUserExists };
  }

  async getLoggedInUser(userId: string) {
    const getUser = await User.findOne({ _id: userId }).select(
      "_id image name email slogan createdAt username  lastSeen starredMessages blockedUsers"
    );
    if (!getUser) {
      throw new CustomError("User not found", 404);
    }
    return getUser;
  }
}

export default new AuthService();
