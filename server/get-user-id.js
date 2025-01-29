require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");

async function getUserInfo() {
  try {
    await mongoose.connect(process.env.MONGO_SRV);
    console.log("Connected to MongoDB");

    const users = await User.find({});
    console.log("\nFound Users:");
    users.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`User ID: ${user._id}`);
      console.log("---");
    });

    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
  }
}

getUserInfo();
