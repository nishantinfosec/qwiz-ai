import mongoose from "mongoose";
const resultSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  testId: mongoose.Schema.Types.ObjectId,
  score: Number,
  total: Number,
});

export default mongoose.model("Result", resultSchema);