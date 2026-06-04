const mongoose = require("mongoose");

const creationSchema = new mongoose.Schema({
  userId: String,
  type: String,
  prompt: String,
  result: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Creation", creationSchema);