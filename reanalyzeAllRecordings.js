// Script to reanalyze all recordings in the database and update pitch score and objections faced
require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');
const analyzeRecording = require('./utils/analyzeRecording');

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const recordings = await Recording.find({});
  console.log(`Found ${recordings.length} recordings. Starting reanalysis...`);

  for (let rec of recordings) {
    try {
      const audioPath = rec.recordingUrl || rec.localPath;
      if (!audioPath) {
        console.warn(`Skipping recording ${rec._id} (no audio path)`);
        continue;
      }
      console.log(`Analyzing recording ${rec._id} (${rec.name})...`);
      const aiResult = await analyzeRecording(audioPath, rec.project);
      rec.transcript = aiResult.transcript || '';
      rec.score = aiResult.score || 0;
      rec.missedPros = aiResult.missedPros || 0;
      rec.prosMentioned = aiResult.prosMentioned || 0;
      rec.topObjection = aiResult.topObjection || '';
      rec.objectionsFaced = aiResult.objectionsFaced || 0;
      rec.objectionsCleared = aiResult.objectionsCleared || 0;
      rec.aiInsights = aiResult.aiInsights || '';
      rec.status = 'reanalyzed';
      await rec.save();
      console.log(`✅ Updated recording ${rec._id}`);
    } catch (err) {
      console.error(`❌ Failed to analyze ${rec._id}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log('Reanalysis complete.');
}

main();
