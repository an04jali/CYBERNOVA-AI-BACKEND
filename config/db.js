const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("MONGO_URI =", process.env.MONGO_URI);
    console.log("MONGODB_URI =", process.env.MONGODB_URI);

    const uri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI;

    await mongoose.connect(uri);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;