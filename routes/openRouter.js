import express from "express";
import axios from "axios";

const router = express.Router();

// --- Common function (FIXED) ---
const callOpenRouter = async (messages) => {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "stepfun/step-3.5-flash:free",
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return (
      response.data?.choices?.[0]?.message?.content || "No reply from AI"
    );
  } catch (err) {
    console.error("OpenRouter API Error:", err.response?.data || err.message);
    throw err;
  }
};

// --- Test route ---
router.get("/test", (req, res) => {
  res.json({ reply: "OpenRouter test working ✅" });
});

// --- Questions endpoint ---
router.post("/questions", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ reply: "Please provide a prompt 😅" });
  }

  try {
    const text = await callOpenRouter([
      { role: "user", content: prompt },
    ]);

    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({
      reply: "AI server error 😢",
    });
  }
});

// --- Chatbot endpoint ---
router.post("/chatbot", async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ reply: "Please type a message 😅" });
  }

  try {
    const text = await callOpenRouter([
      ...history,
      { role: "user", content: message },
    ]);

    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ reply: "AI server error 😢" });
  }
});

// --- 🧠 GENERATE QUESTIONS (FIXED + JSON SAFE) ---
router.post("/generate-questions", async (req, res) => {
  const { subject, level, lang } = req.body;

  if (!subject || !level) {
    return res
      .status(400)
      .json({ message: "Subject and level required 😅" });
  }

  try {
    const prompt = `
Generate 20 MCQ questions for ${subject} at ${level} level in ${lang} language.

IMPORTANT:
- Questions MUST be in ${lang}
- Options MUST be in ${lang}

Return ONLY valid JSON (no markdown, no text):

[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "exact option text",
    "explanation": "Explain concept in 2-3 lines why answer is correct"
  }
]
`;

    let text = await callOpenRouter([
      { role: "user", content: prompt },
    ]);

    // remove markdown if AI adds it
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let questions;

    try {
      questions = JSON.parse(text);
    } catch (err) {
      console.error("JSON Parse Error:", text);
      return res.status(500).json({
        message: "AI returned invalid JSON",
        raw: text,
      });
    }

    res.json({ questions });
  } catch (err) {
    console.error("Generate Questions Error:", err.message);
    res.status(500).json({
      message: "Error generating questions 😢",
    });
  }
});

export default router;