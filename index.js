import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

import chatRouter from "./routes/chat.js"; // Chat router
import openRouter from "./routes/openRouter.js"; // OpenRouter AI

dotenv.config();
const app = express(); // ✅ app must be defined first

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// ----------------- MongoDB Connect -----------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.log("MongoDB connection error:", err);
    process.exit(1); // stop server if DB not connected
  });

// ----------------- User Schema -----------------
import mongoosePkg from "mongoose";
const { Schema, model } = mongoosePkg;

const userSchema = new Schema({
  userId: String,
  name: String,
  email: { type: String, unique: true },
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
  try {
    const { userId, name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ userId, name, email, password: hashedPassword, role });
    await user.save();

    res.status(201).json({ message: "User created successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/api/users/login", async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password
app.post("/api/users/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const resetURL = `http://localhost:3000/reset-password/${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click <a href="${resetURL}">here</a> to reset your password. This link is valid for 1 hour.</p>`,
    });

    res.status(200).json({ message: "Reset email sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Reset Password
app.post("/api/users/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Profile (Protected)
app.get("/api/users/profile", verifyToken, (req, res) => {
  res.json({ message: "Protected route accessed", user: req.user });
});

// ----------------- OpenRouter AI -----------------
app.use("/api/openrouter", openRouter);

// ----------------- Chatbot Route -----------------
app.use("/api/chat", chatRouter);

// ----------------- Root / Health check -----------------
app.get("/", (req, res) => res.send("API Running ✅"));

// ----------------- 404 Handler -----------------
app.use((req, res) => res.status(404).json({ message: "API endpoint not found" }));

// ----------------- Start Server -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));