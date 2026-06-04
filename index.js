const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");

const connectDB = require("./config/db");
const Creation = require("./models/Creation");

dotenv.config();

const app = express();

// Connect MongoDB
connectDB();

app.use(cors());
app.use(express.json());

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
      return res.status(400).json({
        success: false,
        message: "Topic is required",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `
Write a professional blog article about "${prompt}".

Requirements:
- Create a catchy SEO-friendly title
- Write a compelling introduction
- Include at least 5 detailed headings
- Use markdown formatting
- Add bullet points where appropriate
- Include practical examples
- Make the content beginner-friendly
- Write around 1000-1500 words
- Add a conclusion section
- Return only the article content in markdown
          `,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const article = completion.choices[0].message.content;

    // Save Article to MongoDB
    await Creation.create({
      userId: "demo-user",
      type: "Article",
      prompt,
      result: article,
    });

    res.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Groq Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to generate article",
    });
  }
});

// Get Recent Creations
app.get("/creations", async (req, res) => {
  try {
    const creations = await Creation.find()
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(creations);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
