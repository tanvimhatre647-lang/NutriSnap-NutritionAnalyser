const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema({
  calories: { type: Number, default: 0 },
  protein:  { type: Number, default: 0 },
  carbs:    { type: Number, default: 0 },
  fat:      { type: Number, default: 0 },
  fiber:    { type: Number, default: 0 },
  sugar:    { type: Number, default: 0 },
  sodium:   { type: Number, default: 0 },
  vitamins: { type: Map, of: Number },
  minerals: { type: Map, of: Number }
}, { _id: false });

const scanHistorySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodName:  { type: String, required: true, trim: true },
  confidence:{ type: Number, min: 0, max: 100 },
  nutrition: nutritionSchema
}, { timestamps: true });

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
