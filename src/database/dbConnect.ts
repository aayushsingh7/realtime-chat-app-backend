import mongoose from "mongoose";
import "dotenv/config";

mongoose
  .connect(`${process.env.DB_URI}`)
  .then(() => console.log("Database Connected Successfully"))
  .catch((err) => console.log("MongoDB Error: ", err));

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
