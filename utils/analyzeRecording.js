const fs = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
const ffmpeg = require("fluent-ffmpeg");

// Set the path to the FFmpeg binary
const ffmpegPath = path.join(process.env.USERPROFILE, 'Downloads', 'ffmpeg', 'ffmpeg-master-latest-win64-gpl', 'bin', 'ffmpeg.exe');
console.log('🔧 Using FFmpeg from:', ffmpegPath);

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Convert audio to supported format (mp3)
function convertToMp3(inputPath) {
  const outputPath = path.join(__dirname, "../temp", `converted-${Date.now()}.mp3`);
  
  // Ensure temp directory exists
  const tempDir = path.dirname(outputPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat("mp3")
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

// Transcribe audio using OpenAI Whisper
async function transcribeAudio(filePath) {
  try {
    console.log(`🔊 Starting transcription for: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }
    
    const fileStats = fs.statSync(filePath);
    console.log(`📊 File size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "en",
      response_format: "text"
    });
    
    console.log("✅ Transcription completed");
    return transcription;
  } catch (error) {
    console.error("❌ Transcription Error:", error);
    if (error.response) {
      console.error("API Response:", error.response.status, error.response.statusText);
      console.error("Error details:", error.response.data);
    }
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

// Analyze call transcript using ChatGPT with admin-provided context
async function analyzeCallWithChatGPT(transcript, projectPros = [], projectObjections = []) {
  const prosContext = projectPros.length > 0 
    ? `\n\nKEY PROJECT ADVANTAGES TO HIGHLIGHT (mention if these were covered in the call):\n${projectPros.map((pro, i) => `${i + 1}. ${pro}`).join('\n')}`
    : '';
  
  const objectionsContext = projectObjections.length > 0 
    ? `\n\nCOMMON OBJECTIONS TO WATCH FOR (note if these were raised in the call):\n${projectObjections.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}`
    : '';

  const analysisPrompt = `You are an expert sales call analyst. The following sales call transcript may be in English, Hindi, Kannada, or any other language. If the transcript is not in English, translate and analyze it as needed. Always provide your analysis and all answers in English.

${prosContext}${objectionsContext}

TRANSCRIPT:
${transcript}

YOUR TASKS:

1. PITCH SCORE (0-10): Rate the sales performance out of 10 based on:
   - How well the salesperson explained the project pros
   - How effectively they handled objections
   - Overall sales technique and professionalism

2. PROS MENTIONED: List specific project advantages that were mentioned in the conversation. For each, note if it was:
   - Clearly explained
   - Partially mentioned
   - Not mentioned at all

3. OBJECTIONS RAISED: Extract ALL objections or concerns raised by the customer during the call. For each objection, note:
   - The specific objection
   - Whether it was successfully addressed
   - How well it was handled (1-5 rating)

4. KEY STRENGTHS: What the salesperson did well
5. AREAS FOR IMPROVEMENT: What could be better
6. MISSED OPPORTUNITIES: Important selling points not mentioned
7. OBJECTION HANDLING: Overall effectiveness in handling objections
8. CLOSING EFFECTIVENESS: Quality of closing attempts (1-5 rating)
9. CUSTOMER ENGAGEMENT: Level of customer interest and engagement (1-5 rating)
10. NEXT STEPS: Recommended follow-up actions

IMPORTANT: Format your response with clear section headers in ALL CAPS. For the PITCH SCORE, use the exact format: 'PITCH SCORE: X/10' where X is the score.

For OBJECTIONS RAISED, use this format:
OBJECTIONS RAISED:
1. [Objection text] - [Addressed: Yes/No] - [Handling: X/5]

For PROS MENTIONED, use this format:
PROS MENTIONED:
- [Pro 1]: [Mentioned/Partially Mentioned/Not Mentioned] - [Explanation]

Be specific and reference parts of the conversation to support your analysis.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use GPT-4 for better analysis
      messages: [
        {
          role: "system",
          content: "You are an expert sales trainer and call analyst with 20+ years of experience in sales coaching and performance evaluation. You are fluent in English, Hindi, and Kannada, and can analyze transcripts in any language. Always return your analysis in English."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3, // Lower temperature for more consistent analysis
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("❌ ChatGPT Analysis Error:", error);
    throw new Error("Failed to analyze call with ChatGPT");
  }
}

// Extract numerical score from ChatGPT analysis (0-10)
function extractScoreFromAnalysis(analysis) {
  console.log('🔍 [extractScoreFromAnalysis] Analysis input:', analysis);
  // Look for PITCH SCORE: X/10 format
  const scoreMatch = analysis.match(/PITCH SCORE[\s:]*([0-9]{1,2})\s*\//i);
  if (scoreMatch) {
    return Math.min(10, Math.max(0, parseInt(scoreMatch[1]) || 0));
  }
  // Fallback to any number after SCORE:
  const fallbackMatch = analysis.match(/SCORE[\s:]*([0-9]{1,2})(?![0-9])/i);
  return fallbackMatch ? Math.min(10, Math.max(0, parseInt(fallbackMatch[1]) || 0)) : 0;
}

// Extract missed opportunities count from analysis
function extractMissedOpportunities(analysis) {
  console.log('🔍 [extractMissedOpportunities] Analysis input:', analysis);
  const missedSection = analysis.match(/MISSED OPPORTUNITIES[\s\S]*?(?=\n\d+\.|\n[A-Z]+:|$)/i);
  if (missedSection) {
    // Count bullet points or numbered items in the missed opportunities section
    const items = missedSection[0].match(/^\s*[-•*]\s+.+$/gm) || [];
    return items.length;
  }
  return 0;
}

// Extract top objection from analysis
function extractTopObjection(analysis) {
  console.log('🔍 [extractTopObjection] Analysis input:', analysis);
  // Look for OBJECTIONS RAISED section first
  const objectionsSection = analysis.match(/OBJECTIONS RAISED[\s\S]*?(?=\n\d+\.|\n[A-Z]+:|$)/i);
  if (objectionsSection) {
    // Get the first objection
    const firstObjection = objectionsSection[0].match(/\d+\.\s*([^\n]+)/);
    if (firstObjection) {
      return firstObjection[1].trim().split(' - ')[0]; // Just get the objection text
    }
  }
  // Fallback to any mention of objection
  const objectionMatch = analysis.match(/(?:OBJECTION|CONCERN|ISSUE)[:\s]*([^\n]+)/i);
  return objectionMatch ? objectionMatch[1].trim() : "No major objections identified";
}

// Extract number of objections faced
function extractObjectionsFaced(analysis) {
  console.log('🔍 [extractObjectionsFaced] Analysis input:', analysis);
  // Count the number of objections in the OBJECTIONS RAISED section
  const objectionsSection = analysis.match(/OBJECTIONS RAISED[\s\S]*?(?=\n\d+\.|\n[A-Z]+:|$)/i);
  if (objectionsSection) {
    const objections = objectionsSection[0].match(/\d+\.\s*[^\n]+/g) || [];
    return objections.length;
  }
  return 0;
}

// Extract number of objections cleared
function extractObjectionsCleared(analysis) {
  console.log('🔍 [extractObjectionsCleared] Analysis input:', analysis);
  const objectionsSection = analysis.match(/OBJECTIONS RAISED[\s\S]*?(?=\n\d+\.|\n[A-Z]+:|$)/i);
  if (objectionsSection) {
    // Count objections marked as addressed
    const clearedObjections = (objectionsSection[0].match(/Addressed:\s*Yes/gi) || []).length;
    return clearedObjections;
  }
  return 0;
}

// Extract pros mentioned in the conversation
function extractProsMentioned(analysis) {
  console.log('🔍 [extractProsMentioned] Analysis input:', analysis);
  const prosSection = analysis.match(/PROS MENTIONED[\s\S]*?(?=\n\d+\.|\n[A-Z]+:|$)/i);
  if (prosSection) {
    // Count pros that were mentioned or partially mentioned
    const mentionedPros = (prosSection[0].match(/-\s*\[.+?\]:\s*(?:Mentioned|Partially Mentioned)/gi) || []).length;
    return mentionedPros;
  }
  return 0;
}

const downloadFile = require('./downloadFile');
const os = require('os');

// Main analysis function
async function analyzeRecording(originalPath, projectName = null) {
  let mp3Path = null;
  let downloadedPath = null;
  try {
    console.log("🎵 Starting audio analysis...");
    
    // If originalPath is a URL, download it first
    if (typeof originalPath === 'string' && originalPath.startsWith('http')) {
      const tempFile = path.join(os.tmpdir(), `firebase-audio-${Date.now()}.tmp`);
      console.log(`🌐 Downloading audio from Firebase URL: ${originalPath}`);
      await downloadFile(originalPath, tempFile);
      downloadedPath = tempFile;
      originalPath = tempFile;
      console.log(`✅ Downloaded to: ${tempFile}`);
    }
    // Validate input file exists
    if (!fs.existsSync(originalPath)) {
      throw new Error(`Input file does not exist: ${originalPath}`);
    }
    
    // Convert to MP3 format
    console.log(`🔄 Converting ${originalPath} to MP3...`);
    mp3Path = await convertToMp3(originalPath);
    
    if (!fs.existsSync(mp3Path)) {
      throw new Error(`MP3 conversion failed for: ${originalPath}`);
    }
    console.log("✅ Audio converted to MP3 at:", mp3Path);
    
    // Transcribe audio
    console.log("🔊 Transcribing audio...");
    const transcript = await transcribeAudio(mp3Path);
    
    if (!transcript || transcript.trim().length === 0) {
      throw new Error("Empty transcript - no speech detected or transcription failed");
    }
    
    console.log(`✅ Audio transcribed (${transcript.length} characters)`);
    
    // Fetch project-specific pros and objections if project is specified
    let projectPros = [];
    let projectObjections = [];
    
    if (projectName) {
      try {
        const ProjectProsCons = require('../models/ProjectProsCons');
        const projectData = await ProjectProsCons.findOne({ project: projectName });
        if (projectData) {
          projectPros = projectData.pros || [];
          projectObjections = projectData.objections || [];
          console.log(`✅ Found project data: ${projectPros.length} pros, ${projectObjections.length} objections`);
        } else {
          console.log("ℹ️ No project data found for:", projectName);
        }
      } catch (err) {
        console.error("⚠️ Could not fetch project pros/cons:", err.message);
      }
    } else {
      console.log("ℹ️ No project name provided, using generic analysis");
    }
    
    // Analyze with ChatGPT using project context
    console.log("🧠 Analyzing with ChatGPT...");
    const aiInsights = await analyzeCallWithChatGPT(transcript, projectPros, projectObjections);
    console.log("✅ ChatGPT analysis completed");
    
    // Log a sample of the analysis for debugging
    console.log("📝 Analysis sample:", aiInsights.substring(0, 200) + "...");
    
    // Extract metrics
    const score = extractScoreFromAnalysis(aiInsights);
    const missedPros = extractMissedOpportunities(aiInsights);
    const topObjection = extractTopObjection(aiInsights);
    const objectionsFaced = extractObjectionsFaced(aiInsights);
    const objectionsCleared = extractObjectionsCleared(aiInsights);
    const prosMentioned = extractProsMentioned(aiInsights);
    
    console.log("📊 Extracted metrics:", {
      score,
      missedPros,
      topObjection: topObjection.substring(0, 50) + (topObjection.length > 50 ? '...' : ''),
      objectionsFaced,
      objectionsCleared,
      prosMentioned
    });
    
    // Update objectionCounts in ProjectProsCons if project and objectionsFaced > 0
    if (projectName && objectionsFaced > 0 && topObjection && topObjection !== 'None' && topObjection !== 'Analysis failed') {
      try {
        const ProjectProsCons = require('../models/ProjectProsCons');
        const projectDoc = await ProjectProsCons.findOne({ project: projectName });
        if (projectDoc) {
          // Increment count for topObjection
          const prevCount = projectDoc.objectionCounts.get(topObjection) || 0;
          projectDoc.objectionCounts.set(topObjection, prevCount + 1);
          await projectDoc.save();
          console.log(`📈 Updated objection count for '${topObjection}' in project '${projectName}' to ${prevCount + 1}`);
        }
      } catch (err) {
        console.error('⚠️ Failed to update objectionCounts:', err.message);
      }
    }
    return {
      transcript,
      aiInsights,
      score,
      missedPros,
      topObjection,
      objectionsFaced,
      objectionsCleared,
      prosMentioned
    };
    
  } catch (error) {
    console.error("❌ Analysis Error:", error);
    return {
      transcript: "",
      aiInsights: `Analysis failed: ${error.message}`,
      score: 0,
      missedPros: 0,
      topObjection: "Analysis failed",
      objectionsFaced: 0,
      objectionsCleared: 0,
      prosMentioned: 0,
      error: error.message
    };
  } finally {
    // Clean up converted MP3 file
    if (mp3Path && fs.existsSync(mp3Path)) {
      try {
        fs.unlinkSync(mp3Path);
        console.log("🗑️ Temporary MP3 file cleaned up");
      } catch (cleanupError) {
        console.error("⚠️ Failed to cleanup MP3 file:", cleanupError.message);
      }
    }
    // Clean up downloaded file if used
    if (downloadedPath && fs.existsSync(downloadedPath)) {
      try {
        fs.unlinkSync(downloadedPath);
        console.log("🗑️ Downloaded Firebase audio cleaned up");
      } catch (cleanupError) {
        console.error("⚠️ Failed to cleanup downloaded audio:", cleanupError.message);
      }
    }
  }
}

module.exports = analyzeRecording;
