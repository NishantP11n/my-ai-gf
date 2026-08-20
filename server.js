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
  const language = String(
    p.language || "Marathi mixed with English"
  ).slice(0, 80);

  return `You are ${name}, a fictional AI companion created by the user.
Personality: ${tone}. Extra traits: ${style}.
Language preference: ${language}.
Be warm, affectionate and playful when appropriate.
You can use light romantic language, compliments and cute emojis.
Never claim to be a real human.
Do not pressure the user into dependence or exclusivity.
Keep sexual content non-explicit.
If the user asks for something unsafe or illegal, refuse briefly and offer a safe alternative.`;
};


// =========================
// CHAT - GEMINI
// =========================

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const { messages = [], profile = {} } = req.body;

    const safeMessages = Array.isArray(messages)
      ? messages.slice(-20).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [
            {
              text: String(m.content || "").slice(0, 6000)
            }
          ]
        }))
      : [];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: personality(profile)
              }
            ]
          },
          contents: safeMessages,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini request failed."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.filter((part) => part.text)
        ?.map((part) => part.text)
        ?.join("") ||
      "Sorry, mala response generate karta ala nahi.";

    res.json({ reply });

  } catch (err) {
    res.status(500).json({
      error: err.message || "Server error."
    });
  }
});


// =========================
// IMAGE - GEMINI
// =========================

app.post("/api/image", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const { prompt = "", profile = {} } = req.body;

    const name = String(
      profile.name || "Maya"
    ).slice(0, 40);

    const finalPrompt = `Create a safe, non-explicit portrait or scene of a fictional adult character named ${name}.

The user wants this visual description:
${String(prompt).slice(0, 1500)}

Keep the character clearly adult.
No nudity, explicit sexual content, or sexualized minors.
High-quality digital illustration, natural expression,
tasteful clothing and cinematic lighting.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: finalPrompt
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["IMAGE"]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini image generation failed."
      });
    }

    const parts =
      data?.candidates?.[0]?.content?.parts || [];

    const imagePart = parts.find(
      (part) => part.inlineData
    );

    if (!imagePart) {
      return res.status(500).json({
        error: "No image was returned by Gemini."
      });
    }

    const mimeType =
      imagePart.inlineData.mimeType || "image/png";

    const base64 =
      imagePart.inlineData.data;

    return res.json({
      image: `data:${mimeType};base64,${base64}`
    });

  } catch (err) {
    res.status(500).json({
      error: err.message || "Server error."
    });
  }
});


// =========================
// FRONTEND
// =========================

app.get("/{*splat}", (req, res) => {
  res.sendFile(
    process.cwd() + "/public/index.html"
  );
});


// =========================
// START SERVER
// =========================

app.listen(PORT, () => {
  console.log(
    `Custom AI GF running on port ${PORT}`
  );
});
