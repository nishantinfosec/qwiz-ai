import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/", async (req, res) => {
  try {
    console.log("POST /api/users hit");

    const { userId, name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      userId,
      name,
      email,
      password: hashedPassword,
      role,
    });

    await user.save();

    res.status(201).json({
      message: "User created successfully",
      user,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= LOGIN (JWT ADDED) ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 🔑 TOKEN GENERATE
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= JWT MIDDLEWARE ================= */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* ================= PROTECTED ROUTE ================= */
router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user,
  });
});

/* ================= GET USER ================= */
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.id });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= UPDATE ================= */
router.put("/:id", async (req, res) => {
  try {
    const updates = req.body;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      updates,
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= DELETE ================= */
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ userId: req.params.id });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================= FORGOT PASSWORD ================= */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expire = Date.now() + 3600000; // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expire;
    await user.save();

    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetURL = `http://localhost:3000/reset-password/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click <a href="${resetURL}">here</a> to reset your password. This link is valid for 1 hour.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Reset email sent" });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ================= RESET PASSWORD ================= */
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

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

export default router;