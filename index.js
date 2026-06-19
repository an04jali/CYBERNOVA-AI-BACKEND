const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
const imageRoutes = require("./routes/imageRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const interviewRoutes = require("./routes/interviewRoutes");

const connectDB = require("./config/db");
const Creation = require("./models/Creation");
console.log("HF_TOKEN starts with:", process.env.HF_TOKEN?.slice(0, 10));

const app = express();

// Middleware FIRST
app.use(cors());
app.use(express.json({ limit: "25mb" }));

// Routes AFTER middleware
app.use("/api/images", imageRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/interview", interviewRoutes);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Home Route
app.get("/", (req, res) => {
  res.send("CyberNova API Running 🚀");
});

// Generate Article
app.post("/generate-article", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Topic is required" });
    }
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Write a professional blog article about "${prompt}".` }],
      temperature: 0.7,
      max_tokens: 3000,
    });
    const article = completion.choices[0].message.content;
    await Creation.create({ userId: "demo-user", type: "Article", prompt, result: article });
    res.json({ success: true, article });
  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate article" });
  }
});

// Get Recent Creations
app.get("/creations", async (req, res) => {
  try {
    const creations = await Creation.find().sort({ createdAt: -1 }).limit(20);
    res.json(creations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect DB:", err);
  });