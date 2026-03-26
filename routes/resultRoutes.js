import express from "express";
import Result from "../models/Result.js";

const router = express.Router();

// Save Result
router.post("/", async (req, res) => {
  const result = new Result(req.body);
  await result.save();
  res.json(result);
});

// Get Result
router.get("/", async (req, res) => {
  const data = await Result.find();
  res.json(data);
});

export default router;