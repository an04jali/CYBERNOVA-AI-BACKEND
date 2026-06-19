const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const Groq = require("groq-sdk");
const Creation = require("../models/Creation");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/review", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    let resumeText = "";

    if (req.file.mimetype === "application/pdf") {
      const data = await pdf(req.file.buffer);
      resumeText = data.text;
    } else {
      resumeText = req.file.buffer.toString("utf-8");
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: "Could not extract enough text from the resume",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `
You are an expert resume reviewer, ATS (Applicant Tracking System) specialist, and career coach. Analyze the following resume text thoroughly.

RESUME TEXT:
"""
${resumeText}
"""

Provide a detailed analysis in the following structure using markdown:

## Overall Score
Give an overall score out of 100 with one-line justification.

## ATS Compatibility (Score /100)
- Evaluate formatting, section headers, use of standard fonts/structure
- Check for tables, columns, images, or graphics that may break ATS parsing
- List specific ATS issues found

## Grammar & Language Quality (Score /100)
- Identify grammar mistakes, awkward phrasing, passive voice overuse
- Check tense consistency (especially for past vs current roles)
- List 3-5 specific corrections with original text and suggested fix

## Vocabulary & Action Verbs (Score /100)
- Identify weak/overused words (e.g., "responsible for", "worked on")
- Suggest stronger action verbs and power words
- Highlight repeated words/phrases

## Keyword & SEO Optimization (Score /100)
- Identify industry-relevant keywords present
- Suggest missing keywords/skills commonly expected for the candidate's apparent field
- Comment on keyword density and placement

## Structure & Formatting
- Comment on section order, length, whitespace usage, bullet point structure
- Suggest improvements for readability

## Content Quality
- Check for quantifiable achievements (numbers, percentages, metrics)
- Identify vague statements that need more specificity
- Comment on overall impact and clarity

## Top 5 Priority Improvements
List the 5 most important changes to make, ranked by impact.

## Strengths
List 3-5 things the resume does well.

Be specific, reference actual text from the resume, and give actionable feedback. Return only markdown, no preamble.
          `,
        },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });

    const review = completion.choices[0].message.content;

    await Creation.create({
      userId: "demo-user",
      type: "Resume Review",
      prompt: req.file.originalname,
      result: review,
    });

    return res.json({ success: true, review });

  } catch (error) {
    console.log("\n========== RESUME REVIEW ERROR ==========");
    console.log("MESSAGE:", error.message);
    console.log("===========================================\n");
    return res.status(500).json({
      success: false,
      message: error.message || "Resume review failed",
    });
  }
});

module.exports = router;