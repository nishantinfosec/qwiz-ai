// server/config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Debug: Check if MONGO_URI is loaded
    console.log("MONGO_URI:", process.env.MONGO_URI);

    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;