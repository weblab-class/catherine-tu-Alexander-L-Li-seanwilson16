const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  googleid: String,
  theme: {
    theme_name: String,
    theme_picture_url: String,
  },
});

// compile model from schema
module.exports = mongoose.model("user", UserSchema);
