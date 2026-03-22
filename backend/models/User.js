const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:         { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:      { type: String, required: true },
  name:          { type: String, trim: true },
  age:           { type: Number },
  gender:        { type: String, enum: ['male','female','other'] },
  weight:        { type: Number },
  height:        { type: Number },
  activityLevel: { type: String, enum: ['sedentary','lightly-active','moderately-active','very-active','extra-active'] },
  goal:          { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
