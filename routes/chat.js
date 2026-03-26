import express from "express";
import axios from "axios";

const router = express.Router();

// Common function to call OpenRouter API
const callOpenRouter = async (messages) => {
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
      timeout: 10000, // 10s timeout
    }
  );

  return response.data?.choices?.[0]?.message?.content || "No reply from AI";
};

// ---------------- Questions Endpoint ----------------
router.post("/questions", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim())
    return res.status(400).json({ reply: "Please provide a prompt 😅" });

  try {
    const messages = [{ role: "user", content: prompt }];
    const text = await callOpenRouter(messages);

    res.json({ reply: text });
  } catch (err) {
    console.error("OpenRouter Questions Error:", err.response?.data || err.message);
    res.status(500).json({ reply: "AI server error 😢. Check API key or quota." });
  }
});

// ---------------- Chatbot Endpoint ----------------
router.post("/chatbot", async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message || !message.trim())
    return res.status(400).json({ reply: "Please type a message 😅" });

  try {
    const messages = [...history, { role: "user", content: message }];
    const text = await callOpenRouter(messages);

    res.json({ reply: text });
  } catch (err) {
    console.error("OpenRouter Chatbot Error:", err.response?.data || err.message);
    res.status(500).json({ reply: "AI server error 😢. Check API key or quota." });
  }
});

// Optional test route
router.get("/test", (req, res) => {
  res.json({ reply: "OpenRouter chat router is working ✅" });
});

export default router;