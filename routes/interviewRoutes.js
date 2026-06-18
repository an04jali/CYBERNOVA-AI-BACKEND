const express = require("express");
const Groq = require("groq-sdk");
const Creation = require("../models/Creation");

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ... /questions and /analyze-answer routes stay exactly the same as before ...

router.post("/summary", async (req, res) => {
  try {
    const { role, qaPairs } = req.body;

    if (!role || !qaPairs || qaPairs.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Role and answers are required",
      });
    }

    const totalWords = qaPairs.reduce((sum, qa) => sum + (qa.metrics?.wordCount || 0), 0);
    const totalFillers = qaPairs.reduce((sum, qa) => sum + (qa.metrics?.fillerCount || 0), 0);
    const totalHedges = qaPairs.reduce((sum, qa) => sum + (qa.metrics?.hedgeCount || 0), 0);
    const avgWpm = qaPairs.filter(qa => qa.metrics?.wpm).length > 0
      ? Math.round(qaPairs.reduce((sum, qa) => sum + (qa.metrics?.wpm || 0), 0) / qaPairs.filter(qa => qa.metrics?.wpm).length)
      : null;

    const transcript = qaPairs
      .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
      .join("\n\n");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: `
You are an expert interview coach. Review this full mock interview transcript for a "${role}" position and give an overall performance summary.

TRANSCRIPT:
${transcript}

AGGREGATE METRICS:
- Total words across all answers: ${totalWords}
- Total filler words: ${totalFillers}
- Total hedging phrases: ${totalHedges}
- Average speaking pace: ${avgWpm ? avgWpm + " WPM" : "not available"}

Provide a summary in this markdown structure:

## Overall Performance Score (/100)
With one-line justification.

## Key Strengths
3-4 things the candidate did well across the interview.

## Key Areas to Improve
3-4 the most important things to work on, ranked by impact.

## Pattern Observations
Comment on consistency across answers - did performance improve/decline as the interview progressed? Any recurring weak phrases or strong techniques?

## Recommended Next Steps
2-3 concrete actions to prepare better before a real interview.

Return only markdown, no preamble.
          `,
        },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    });

    const summary = completion.choices[0].message.content;

    await Creation.create({
      userId: "demo-user",
      type: "Mock Interview",
      prompt: role,
      result: summary,
    });

    return res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.log("\n========== INTERVIEW SUMMARY ERROR ==========");
    console.log("MESSAGE:", error.message);
    console.log("===============================================\n");

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate summary",
    });
  }
});

module.exports = router;