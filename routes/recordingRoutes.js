const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Recording = require("../models/Recording");
const analyzeRecording = require("../utils/analyzeRecording");
const { uploadAudioToFirebase, deleteAudioFromFirebase } = require("../utils/firebaseStorage");

const router = express.Router();

// Configure multer for temporary storage before Firebase upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempPath = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
    cb(null, tempPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type. Only audio files are allowed.');
      error.code = 'LIMIT_FILE_TYPES';
      return cb(error, false);
    }
    cb(null, true);
  }
});

const upload = multer({ storage });

// Error handling middleware
const handleErrors = (err, req, res, next) => {
  console.error('❌ Route error:', err);
  
  if (err.code === 'LIMIT_FILE_TYPES') {
    return res.status(422).json({ error: 'Invalid file type. Only audio files are allowed.' });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(422).json({ error: 'File is too large. Maximum size is 50MB.' });
  }
  
  res.status(500).json({ 
    error: 'An error occurred while processing your request.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

/**
 * POST /api/recordings
 * Upload audio file + metadata + AI analysis
 */
router.post("/", upload.single("audio"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const { name, phone, email, project, userName } = req.body;
  const tempFilePath = req.file.path;
  const fileName = req.file.filename;

  try {
    // Validate required fields
    if (!email || !userName) {
      throw new Error('Email and userName are required fields');
    }

    console.log(`📤 Uploading ${fileName} to Firebase...`);
    // Upload to Firebase Storage
    const firebaseUrl = await uploadAudioToFirebase(tempFilePath, fileName);
    
    // Create initial recording record
    const recording = new Recording({
      name: name?.trim() || "Customer",
      phone: phone?.trim() || "N/A",
      email: email.trim(),
      userName: userName.trim(),
      project: project?.trim() || "General",
      recordingUrl: firebaseUrl,
    });

    await recording.save();
    console.log(`✅ Recording saved with ID: ${recording._id}`);

    // Process analysis in background
    processAnalysis(recording, tempFilePath, project);

    // Respond immediately with recording ID
    res.status(202).json({ 
      message: "Recording uploaded successfully. Analysis in progress...",
      recordingId: recording._id,
      status: 'processing'
    });

  } catch (error) {
    console.error('❌ Error in recording upload:', error);
    
    // Clean up temp file on error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    next(error);
  }
});

/**
 * Background process for audio analysis
 */
async function processAnalysis(recording, tempFilePath, project) {
  console.log(`\n🔍 [${new Date().toISOString()}] Starting analysis for recording ${recording._id}...`);
  console.log(`   Project: ${project || 'None'}`);
  console.log(`   Temp file: ${tempFilePath}`);
  
  try {
    // Log initial state
    console.log(`   Recording state before analysis:`, {
      hasTranscript: !!recording.transcript,
      hasAiInsights: !!recording.aiInsights,
      score: recording.score
    });
    
    // Run analysis (this can take time)
    console.log('   Starting analyzeRecording...');
    const aiResult = await analyzeRecording(tempFilePath, project);
    
    console.log(`✅ [${new Date().toISOString()}] Analysis completed for ${recording._id}`);
    console.log('   Analysis results:', {
      transcriptLength: aiResult.transcript?.length || 0,
      score: aiResult.score,
      prosMentioned: aiResult.prosMentioned,
      objectionsFaced: aiResult.objectionsFaced,
      aiInsightsLength: aiResult.aiInsights?.length || 0
    });
    
    // Update recording with analysis results
    recording.transcript = aiResult.transcript || "";
    recording.score = aiResult.score || 0;
    recording.missedPros = aiResult.missedPros || 0;
    recording.prosMentioned = aiResult.prosMentioned || 0;
    recording.topObjection = aiResult.topObjection || "None";
    recording.objectionsFaced = aiResult.objectionsFaced || 0;
    recording.objectionsCleared = aiResult.objectionsCleared || 0;
    recording.aiInsights = aiResult.aiInsights || "";
    
    console.log('   Saving recording to database...');
    await recording.save();
    console.log(`📊 [${new Date().toISOString()}] Analysis saved for recording ${recording._id}`);
    
  } catch (error) {
    const errorId = `ERR-${Date.now()}`;
    console.error(`\n❌ [${new Date().toISOString()}] Analysis failed (${errorId}) for recording ${recording?._id || 'unknown'}:`);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      response: error.response?.data
    });
    
    // Update recording with detailed error status
    if (recording) {
      recording.aiInsights = `Analysis failed (${errorId}): ${error.message}\n\n${error.stack || ''}`;
      recording.score = 0;
      recording.status = 'failed';
      recording.error = {
        id: errorId,
        message: error.message,
        code: error.code,
        timestamp: new Date()
      };
      
      try {
        await recording.save();
        console.log(`   Error state saved for recording ${recording._id}`);
      } catch (saveError) {
        console.error('   Failed to save error state:', saveError);
      }
    }
    
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️ Temporary file cleaned up: ${tempFilePath}`);
      } catch (cleanupErr) {
        console.error('⚠️ Failed to cleanup temp file:', cleanupErr.message);
      }
    }
  }
}

/**
 * GET /api/recordings/:id/status
 * Check analysis status
 */
router.get('/:id/status', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    
    // Check if analysis is complete (has a score or insights)
    const isComplete = recording.score > 0 || recording.aiInsights?.length > 0;
    
    res.json({
      status: isComplete ? 'completed' : 'processing',
      recording: {
        id: recording._id,
        score: recording.score,
        transcript: recording.transcript,
        aiInsights: recording.aiInsights,
        objectionsFaced: recording.objectionsFaced,
        objectionsCleared: recording.objectionsCleared,
        prosMentioned: recording.prosMentioned,
        missedPros: recording.missedPros,
        topObjection: recording.topObjection,
        recordingUrl: recording.recordingUrl,
        updatedAt: recording.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Apply error handling middleware
router.use(handleErrors);

/**
 * GET /api/recordings?project=XYZ
 */
router.get("/", async (req, res) => {
  try {
    const { project } = req.query;
    const filter = project ? { project } : {};
    const recordings = await Recording.find(filter).sort({ date: -1 });
    res.status(200).json(recordings);
  } catch (err) {
    console.error("❌ Error fetching recordings:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Utility functions moved to analyzeRecording.js for better organization

/**
 * POST /api/recordings/:id/retry-analysis
 * Manually retry analysis for a recording (admin only)
 */
router.post('/api/recordings/:id/retry-analysis', async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }
    // Use recordingUrl if present, otherwise local file path
    const audioPath = recording.recordingUrl || recording.localPath;
    if (!audioPath) {
      return res.status(400).json({ error: 'No audio file available for analysis.' });
    }
    // Run analysis pipeline (handles Firebase download if needed)
    const aiResult = await analyzeRecording(audioPath, recording.project);
    recording.transcript = aiResult.transcript || '';
    recording.score = aiResult.score || 0;
    recording.missedPros = aiResult.missedPros || 0;
    recording.prosMentioned = aiResult.prosMentioned || 0;
    recording.topObjection = aiResult.topObjection || '';
    recording.objectionsFaced = aiResult.objectionsFaced || 0;
    recording.objectionsCleared = aiResult.objectionsCleared || 0;
    recording.aiInsights = aiResult.aiInsights || '';
    recording.status = 'reanalyzed';
    await recording.save();
    res.json({ message: 'Analysis retried successfully', recording });
  } catch (err) {
    console.error('❌ Retry analysis error:', err);
    res.status(500).json({ error: 'Failed to retry analysis', details: err.message });
  }
});

/**
 * GET /api/projects/:project/objection-counts
 * Get objection counts for a project
 */
router.get('/api/projects/:project/objection-counts', async (req, res) => {
  try {
    const ProjectProsCons = require('../models/ProjectProsCons');
    const projectDoc = await ProjectProsCons.findOne({ project: req.params.project });
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ objectionCounts: Object.fromEntries(projectDoc.objectionCounts || []) });
  } catch (err) {
    console.error('❌ Objection counts API error:', err);
    res.status(500).json({ error: 'Failed to fetch objection counts', details: err.message });
  }
});

module.exports = router;
