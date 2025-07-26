const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  project: String,
}, { timestamps: true });

module.exports = mongoose.model('Member', memberSchema);
