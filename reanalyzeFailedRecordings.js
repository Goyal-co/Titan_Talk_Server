require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');
const analyzeRecording = require('./utils/analyzeRecording');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const failed = await Recording.find({
    aiInsights: /Analysis failed/i,
    recordingUrl: { $regex: /^https?:/ }
  });

  console.log(`Found ${failed.length} failed recordings with Firebase URLs.`);

  for (const rec of failed) {
    console.log(`Re-analyzing: ${rec._id} (${rec.name})`);
    try {
      const result = await analyzeRecording(rec.recordingUrl, rec.project);
      rec.transcript = result.transcript || '';
      rec.score = result.score || 0;
      rec.missedPros = result.missedPros || 0;
      rec.prosMentioned = result.prosMentioned || 0;
      rec.topObjection = result.topObjection || '';
      rec.objectionsFaced = result.objectionsFaced || 0;
      rec.objectionsCleared = result.objectionsCleared || 0;
      rec.aiInsights = result.aiInsights || '';
      rec.status = 'reanalyzed';
      await rec.save();
      console.log(`✅ Updated recording ${rec._id}`);
    } catch (err) {
      console.error(`❌ Failed to re-analyze ${rec._id}:`, err.message);
    }
  }

  mongoose.disconnect();
}

main();
