import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },

  options: {
    type: [String], // 4 options
    required: true,
    validate: [(val) => val.length === 4, "Must have 4 options"],
  },

  correctAnswer: {
    type: Number, // index (0-3)
    required: true,
  },

  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "easy",
  },

  topic: {
    type: String,
    default: "general",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Question", questionSchema);