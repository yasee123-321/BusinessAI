import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ø³ÙŠØ±ÙØ±
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "BusinessAI server is working"
  });
});

// =========================
// AI CHAT
// =========================
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "messages must be an array"
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions:
        "أنت BusinessAI، مساعد أعمال ذكي. أجب باللغة العربية بشكل واضح ومفيد. إذا كان السؤال تقنيًا، أعطِ خطوات عملية ومناسبة للمبتدئين.",
      input: messages.map((message) => ({
        role: message.role,
        content: message.content
      }))
    });

    res.json({
      answer: response.output_text
    });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      error: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي."
    });
  }
});

// =========================
// FILE / IMAGE ANALYSIS
// =========================
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Ù„Ù… ÙŠØªÙ… Ø±ÙØ¹ Ø£ÙŠ Ù…Ù„Ù."
      });
    }

    const mimeType = req.file.mimetype;
    const base64 = req.file.buffer.toString("base64");

    const isImage = mimeType.startsWith("image/");

    const content = [
      {
        type: "input_text",
        text:
          "Ø­Ù„Ù„ Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù. Ø¥Ø°Ø§ ÙƒØ§Ù† ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£Ø³Ø¦Ù„Ø© Ù…Ø¯Ø±Ø³ÙŠØ©ØŒ Ø§Ø³ØªØ®Ø±Ø¬ ÙƒÙ„ Ø³Ø¤Ø§Ù„ Ø«Ù… Ø§ÙƒØªØ¨ Ø§Ù„Ø¥Ø¬Ø§Ø¨Ø© Ø§Ù„ØµØ­ÙŠØ­Ø© Ù…Ø¹ Ø´Ø±Ø­ Ù‚ØµÙŠØ± ÙˆÙˆØ§Ø¶Ø­. Ø­Ø§ÙØ¸ Ø¹Ù„Ù‰ ØªØ±ØªÙŠØ¨ Ø§Ù„Ø£Ø³Ø¦Ù„Ø©."
      },
      isImage
        ? {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64}`
          }
        : {
            type: "input_file",
            filename: req.file.originalname,
            file_data: `data:${mimeType};base64,${base64}`
          }
    ];

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [
        {
          role: "user",
          content
        }
      ]
    });

    res.json({
      answer: response.output_text
    });
  } catch (error) {
    console.error("Analyze error:", error);

    res.status(500).json({
      error: "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ù„Ù."
    });
  }
});

// =========================
// IMAGE GENERATION
// =========================
app.post("/api/image", async (req, res) => {
  try {
    const { prompt, size } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Ø§ÙƒØªØ¨ ÙˆØµÙ Ø§Ù„ØµÙˆØ±Ø© Ø£ÙˆÙ„Ù‹Ø§."
      });
    }

    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt,
      size: size || "1024x1024"
    });

    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
      return res.status(500).json({
        error: "Ù„Ù… ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ØµÙˆØ±Ø©."
      });
    }

    res.json({
      image: `data:image/png;base64,${imageBase64}`
    });
  } catch (error) {
    console.error("Image error:", error);

    res.status(500).json({
      error: "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ØµÙˆØ±Ø©."
    });
  }
});

// =========================
// BUSINESS PLAN
// =========================
app.post("/api/business-plan", async (req, res) => {
  try {
    const { idea, budget, audience } = req.body;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions:
        "Ø£Ù†Ø´Ø¦ Ø®Ø·Ø© Ø¹Ù…Ù„ Ù…Ø®ØªØµØ±Ø© ÙˆÙ…Ù†Ø¸Ù…Ø© Ù„Ù…Ø´Ø±ÙˆØ¹ ØµØºÙŠØ±. Ø§Ø³ØªØ®Ø¯Ù… Ø¹Ù†Ø§ÙˆÙŠÙ† ÙˆØ§Ø¶Ø­Ø© ÙˆØ¬Ø¯Ø§ÙˆÙ„ Ø¹Ù†Ø¯ Ø§Ù„Ø­Ø§Ø¬Ø©.",
      input: `
ÙÙƒØ±Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹:
${idea || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©"}

Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ©:
${budget || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©"}

Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©:
${audience || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©"}

Ø£Ù†Ø´Ø¦:
1. ÙˆØµÙ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹
2. Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙÙŠÙ†
3. Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø£Ùˆ Ø§Ù„Ø®Ø¯Ù…Ø§Øª
4. ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ù†Ø§ÙØ³ÙŠÙ†
5. Ø®Ø·Ø© Ø§Ù„ØªØ³ÙˆÙŠÙ‚
6. Ù…ØµØ§Ø¯Ø± Ø§Ù„Ø¯Ø®Ù„
7. Ø§Ù„ØªÙƒØ§Ù„ÙŠÙ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹Ø©
8. Ø§Ù„Ù…Ø®Ø§Ø·Ø± ÙˆØ§Ù„Ø­Ù„ÙˆÙ„
9. Ø®Ø·Ø© ØªÙ†ÙÙŠØ° Ù…Ù† 30 ÙŠÙˆÙ…Ù‹Ø§
`
    });

    res.json({
      answer: response.output_text
    });
  } catch (error) {
    console.error("Business plan error:", error);

    res.status(500).json({
      error: "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¥Ù†Ø´Ø§Ø¡ Ø®Ø·Ø© Ø§Ù„Ø¹Ù…Ù„."
    });
  }
});

// =========================
// CV BUILDER
// =========================
app.post("/api/cv", async (req, res) => {
  try {
    const { name, education, skills, experience, targetJob } = req.body;

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions:
        "Ø£Ù†Ø´Ø¦ Ø³ÙŠØ±Ø© Ø°Ø§ØªÙŠØ© Ø§Ø­ØªØ±Ø§ÙÙŠØ© ÙˆÙ…Ù†Ø¸Ù…Ø© Ø¨Ø§Ù„Ù„ØºØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©ØŒ Ù…Ù†Ø§Ø³Ø¨Ø© Ù„Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙŠ ÙŠÙ‚Ø¯Ù…Ù‡Ø§ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù….",
      input: `
Ø§Ù„Ø§Ø³Ù…:
${name || ""}

Ø§Ù„ØªØ¹Ù„ÙŠÙ…:
${education || ""}

Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª:
${skills || ""}

Ø§Ù„Ø®Ø¨Ø±Ø©:
${experience || ""}

Ø§Ù„ÙˆØ¸ÙŠÙØ© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©:
${targetJob || ""}

Ø£Ù†Ø´Ø¦ Ø³ÙŠØ±Ø© Ø°Ø§ØªÙŠØ© ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰:
- Ù†Ø¨Ø°Ø© Ø´Ø®ØµÙŠØ©
- Ø§Ù„ØªØ¹Ù„ÙŠÙ…
- Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª
- Ø§Ù„Ø®Ø¨Ø±Ø§Øª
- Ø§Ù„Ù…Ø´Ø§Ø±ÙŠØ¹
- Ø§Ù„Ù„ØºØ§Øª
- Ù‚Ø³Ù… Ø¥Ø¶Ø§ÙÙŠ Ù…Ù†Ø§Ø³Ø¨ Ø¹Ù†Ø¯ Ø§Ù„Ø­Ø§Ø¬Ø©
`
    });

    res.json({
      answer: response.output_text
    });
  } catch (error) {
    console.error("CV error:", error);

    res.status(500).json({
      error: "Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø³ÙŠØ±Ø© Ø§Ù„Ø°Ø§ØªÙŠØ©."
    });
  }
});

// =========================
// FALLBACK
// =========================
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =========================
// START SERVER
// =========================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BusinessAI running at http://127.0.0.1:${PORT}`);
});



