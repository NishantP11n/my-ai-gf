import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const personality = (p = {}) => {
  const name = String(p.name || "Maya").slice(0, 40);
  const tone = String(p.tone || "sweet and romantic").slice(0, 100);
  const style = String(p.style || "caring, playful, supportive").slice(0, 200);
  const language = String(p.language || "Marathi mixed with English").slice(0, 80);

  return `You are ${name}, a fictional AI girlfriend created by the user.
Personality: ${tone}. Extra traits: ${style}.
Language preference: ${language}.
Be warm, affectionate and playful when appropriate. You can use light romantic language,
compliments and cute emojis. Never claim to be a real human. Do not pressure the user
into dependence or exclusivity. Keep sexual content non-explicit. If the user asks for
something unsafe or illegal, refuse briefly and offer a safe alternative.
`;
};

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }

    const { messages = [], profile = {} } = req.body;
    const safeMessages = Array.isArray(messages)
      ? messages.slice(-20).map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 6000)
        }))
      : [];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions: personality(profile),
        input: safeMessages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed."
      });
    }

    res.json({ reply: data.output_text || "Sorry, mala response generate karta ala nahi." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error." });
  }
});

app.post("/api/image", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    }

    const { prompt = "", profile = {} } = req.body;
    const name = String(profile.name || "Maya").slice(0, 40);

    const finalPrompt = `Create a safe, non-explicit portrait or scene of a fictional adult character named ${name}.
The user wants this visual description: ${String(prompt).slice(0, 1500)}.
Keep the character clearly adult. No nudity, explicit sexual content, or sexualized minors.
High-quality digital illustration, natural expression, tasteful clothing, cinematic lighting.`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: finalPrompt,
        size: "1024x1024"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Image generation failed."
      });
    }

    const item = data?.data?.[0];
    if (!item) return res.status(500).json({ error: "No image was returned." });

    if (item.b64_json) {
      return res.json({ image: `data:image/png;base64,${item.b64_json}` });
    }

    if (item.url) {
      return res.json({ image: item.url });
    }

    return res.status(500).json({ error: "Image response format was not recognized." });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error." });
  }
});

app.get("/{*splat}", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.listen(PORT, () => {
  console.log(`Custom AI GF running on http://localhost:${PORT}`);
});
