const express = require("express");
const axios = require("axios");
const Creation = require("../models/Creation");
const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const {
      prompt,
      width = 1024,
      height = 1024,
      steps = 28,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const response = await axios.post(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        inputs: prompt,
        parameters: {
          width,
          height,
          num_inference_steps: steps,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
          "Accept": "image/png",
        },
        responseType: "arraybuffer",
        timeout: 120000,
      }
    );

    const image = Buffer.from(response.data).toString("base64");

    await Creation.create({
      userId: "demo-user",
      type: "AI Image",
      prompt,
      result: image,
    });

    return res.json({ success: true, image });

  } catch (error) {
    console.log("\n========== HUGGING FACE ERROR ==========");
    console.log("STATUS:", error.response?.status);
    if (error.response?.data) {
      try {
        console.log("ERROR:", Buffer.from(error.response.data).toString("utf8"));
      } catch (e) {
        console.log("ERROR:", error.response.data);
      }
    }
    console.log("MESSAGE:", error.message);
    console.log("========================================\n");
    return res.status(500).json({
      success: false,
      message: error.message || "Image generation failed",
    });
  }
});

router.post("/remove-bg", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("image_file_b64", image);
    formData.append("size", "auto");

    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      formData,
      {
        headers: {
          "X-Api-Key": process.env.REMOVEBG_API_KEY,
          ...formData.getHeaders(),
        },
        responseType: "arraybuffer",
        timeout: 30000,
      }
    );

    const resultImage = Buffer.from(response.data).toString("base64");

    await Creation.create({
      userId: "demo-user",
      type: "Background Removal",
      prompt: "Background removed",
      result: resultImage,
    });

    return res.json({ success: true, image: resultImage });

  } catch (error) {
    console.log("\n========== BG REMOVE ERROR ==========");
    console.log("STATUS:", error.response?.status);
    if (error.response?.data) {
      try {
        console.log("ERROR:", Buffer.from(error.response.data).toString("utf8"));
      } catch (e) {
        console.log("ERROR:", error.response.data);
      }
    }
    console.log("MESSAGE:", error.message);
    console.log("=======================================\n");
    return res.status(500).json({
      success: false,
      message: error.message || "Background removal failed",
    });
  }
});

router.post("/save-history", async (req, res) => {
  try {
    const { type, prompt, result } = req.body;
    console.log("Saving history - type:", type, "result length:", result?.length);
    await Creation.create({ userId: "demo-user", type, prompt, result });
    console.log("History saved successfully");
    return res.json({ success: true });
  } catch (error) {
    console.log("\n========== SAVE HISTORY ERROR ==========");
    console.log("MESSAGE:", error.message);
    console.log("STACK:", error.stack);
    console.log("==========================================\n");
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;