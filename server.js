import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import chatRouter from "./routes/chat.js";
import openRouter from "./routes/openRouter.js";

dotenv.config();

const app = express();  // <-- express app ko pehle declare karo

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/openrouter", openRouter);

// ----------------- MongoDB Connect -----------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected: localhost"))
  .catch(err => console.log("MongoDB connection error:", err));

// ----------------- User Schema -----------------
import mongoosePkg from "mongoose";
const { Schema, model } = mongoosePkg;

const userSchema = new Schema({
  userId: String,
  name: String,
  email: String,
  password: String,
  role: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
});

const User = model("User", userSchema);

// ----------------- JWT Middleware -----------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(403).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ----------------- Auth Routes -----------------
// Register
app.post("/api/users", async (req, res) => {
  const { userId, name, email, password, role } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ userId, name, email, password: hashedPassword, role });
  await user.save();

  res.status(201).json({ message: "User created successfully", user });
});

// Login
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid password" });

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

  res.json({
    message: "Login successful",
    token,
    user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
  });
});

// ----------------- Chatbot Route -----------------
app.use("/api/chat", chatRouter);

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));