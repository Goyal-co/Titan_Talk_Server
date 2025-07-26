const mongoose = require("mongoose");

const RecordingSchema = new mongoose.Schema({
  // Customer Information
  name: { type: String, default: "Customer" },      // Customer name
  phone: { type: String, default: "N/A" },         // Customer phone number
  
  // Sales Representative Information
  email: { type: String, required: true },         // Salesperson email (required)
  userName: { type: String, required: true },      // Salesperson name (required)
  
  // Project and Recording Details
  project: { type: String, default: "General" },   // Project name
  recordingUrl: { type: String, required: true },  // URL to the recording file
  date: { type: Date, default: Date.now },         // When the recording was made
  
  // Transcription and Analysis
  transcript: { type: String, default: "" },       // Full text transcription
  aiInsights: { type: String, default: "" },       // Detailed AI analysis
  
  // Performance Metrics
  score: { type: Number, default: 0, min: 0, max: 10 }, // Overall score (0-10)
  missedPros: { type: Number, default: 0 },        // Number of missed opportunities
  prosMentioned: { type: Number, default: 0 },     // Number of pros mentioned
  
  // Objection Handling
  topObjection: { type: String, default: "" },     // Main objection raised
  objectionsFaced: { type: Number, default: 0 },   // Total objections encountered
  objectionsCleared: { type: Number, default: 0 }, // Successfully addressed objections
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },    // When record was created
  updatedAt: { type: Date, default: Date.now }     // Last update timestamp
});

// Update the updatedAt field on save
RecordingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Recording", RecordingSchema);
