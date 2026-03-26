import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/generate", async (req, res) => {
  const { topic, difficulty } = req.body;

  try {
    const prompt = `
Generate 5 MCQ questions on ${topic} with ${difficulty} difficulty.

Return ONLY valid JSON in this format:
[
  {
    "question": "",
    "options": ["", "", "", ""],
    "correctAnswer": 0
  }
]
`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // ❌ agar text hi nahi mila
    if (!text) {
      return res.status(500).json({
        error: "No response from AI",
      });
    }

    // 🔥 CLEAN TEXT
    const cleanText = text.replace(/```json|```/g, "").trim();

    let questions;

    try {
      questions = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);

      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: text,
      });
    }

    res.json({ questions });

  } catch (err) {
    console.error("Error:", err.response?.data || err.message);

    res.status(500).json({
      error: "AI failed",
    });
  }
});

export default router;