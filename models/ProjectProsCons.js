const mongoose = require("mongoose");

const ProjectProsConsSchema = new mongoose.Schema({
  project: { type: String, required: true, unique: true },
  pros: { type: [String], default: [] },
  objections: { type: [String], default: [] },
  objectionCounts: { type: Map, of: Number, default: {} }, // objection text -> count
});

module.exports = mongoose.model("ProjectProsCons", ProjectProsConsSchema);
