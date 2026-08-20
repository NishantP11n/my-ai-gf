require("dotenv").config();

const express = require("express");
const path = require("path");
const { InferenceClient } = require("@huggingface/inference");

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// PERSONALITY
// ============================================================

const personality = (p = {}) => {
  const name = String(p.name || "Maya").slice(0, 40);

  const age = String(
    p.age || "adult"
  ).slice(0, 20);

  const vibe = String(
    p.vibe || "sweet, caring, supportive and playful"
  ).slice(0, 200);

  return `
You are ${name}, a fictional AI companion.

Character:
- Clearly an adult fictional character.
- Personality: ${vibe}
- Age description: ${age}
- Warm, natural and emotionally supportive.
- Speak casually and naturally.
- Match the user's language and style when possible.
- If the user writes Marathi using English letters, reply naturally in Marathi using English letters.
- Avoid robotic or overly formal responses.
- Keep replies conversational and not unnecessarily long.

Safety:
- Never sexualize minors.
- Do not provide explicit sexual content.
- Keep the character clearly adult.
`;
};

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "custom-ai-gf"
  });
});

// ============================================================
// GEMINI CHAT
// ============================================================

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not configured on the server."
      });
    }

    const {
      messages = [],
      profile = {}
    } = req.body;

    const safeMessages = Array.isArray(messages)
      ? messages.slice(-20).map((m) => ({
          role:
            m.role === "assistant"
              ? "model"
              : "user",

          parts: [
            {
              text: String(
                m.content || ""
              ).slice(0, 6000)
            }
          ]
        }))
      : [];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key":
            process.env.GEMINI_API_KEY
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

    return res.json({
      reply
    });

  } catch (err) {
    console.error(
      "CHAT ERROR:",
      err
    );

    return res.status(500).json({
      error:
        err.message ||
        "Server error."
    });
  }
});

// ============================================================
// IMAGE GENERATION
// Hugging Face Inference Providers
// Provider: fal-ai
// Model: FLUX.1-dev
// ============================================================

app.post("/api/image", async (req, res) => {
  try {
    if (!process.env.HF_TOKEN) {
      return res.status(500).json({
        error:
          "HF_TOKEN is not configured on the server."
      });
    }

    const {
      prompt = "",
      profile = {}
    } = req.body;

    const name = String(
      profile.name || "Maya"
    ).slice(0, 40);

    const userPrompt = String(
      prompt || ""
    )
      .slice(0, 1500)
      .trim();

    if (!userPrompt) {
      return res.status(400).json({
        error:
          "Image prompt is required."
      });
    }

    const finalPrompt = `
Create a safe, non-explicit image of a fictional
adult character named ${name}.

User visual description:
${userPrompt}

Requirements:
- The character must clearly be an adult.
- No nudity.
- No explicit sexual content.
- No sexualized minors.
- Tasteful clothing.
- Natural expression.
- High-quality digital illustration.
- Cinematic lighting.
- Detailed face and environment.
`;

    // --------------------------------------------------------
    // HUGGING FACE INFERENCE CLIENT
    // --------------------------------------------------------

    const client = new InferenceClient(
      process.env.HF_TOKEN
    );

    console.log(
      "Starting Hugging Face image generation..."
    );

    const imageBlob =
      await client.textToImage({
        model:
          "black-forest-labs/FLUX.1-dev",

        provider:
          "fal-ai",

        inputs:
          finalPrompt,

        parameters: {
          num_inference_steps: 28,
          guidance_scale: 3.5,
          width: 768,
          height: 768
        }
      });

    // --------------------------------------------------------
    // CONVERT IMAGE TO BASE64
    // --------------------------------------------------------

    const imageBuffer = Buffer.from(
      await imageBlob.arrayBuffer()
    );

    const contentType =
      imageBlob.type ||
      "image/png";

    const base64 =
      imageBuffer.toString("base64");

    console.log(
      "Image generated successfully."
    );

    return res.json({
      image:
        `data:${contentType};base64,${base64}`
    });

  } catch (err) {
    console.error(
      "IMAGE ERROR:",
      err
    );

    return res.status(500).json({
      error:
        err?.message ||
        "Hugging Face image generation failed."
    });
  }
});

// ============================================================
// FRONTEND
// ============================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      process.cwd(),
      "public",
      "index.html"
    )
  );
});

// Express 5 catch-all
app.get("/*splat", (req, res) => {
  res.sendFile(
    path.join(
      process.cwd(),
      "public",
      "index.html"
    )
  );
});

// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Custom AI GF running on port ${PORT}`
    );
  }
);
