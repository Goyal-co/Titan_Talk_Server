require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');

async function debugDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.mongo_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Fetch all recordings
    const recordings = await Recording.find({}).sort({ date: -1 });
    console.log(`📊 Found ${recordings.length} recordings in database`);

    recordings.forEach((recording, index) => {
      console.log(`\n--- Recording ${index + 1} ---`);
      console.log('ID:', recording._id);
      console.log('Name:', recording.name);
      console.log('Date:', recording.date);
      console.log('Score:', recording.score);
      console.log('Missed Pros:', recording.missedPros);
      console.log('Top Objection:', recording.topObjection);
      console.log('Recording URL:', recording.recordingUrl ? 'Present' : 'Missing');
    });

    // Calculate statistics
    const totalRecordings = recordings.length;
    const avgScore = recordings.length > 0 
      ? recordings.reduce((sum, r) => sum + (r.score || 0), 0) / recordings.length 
      : 0;
    const totalMissedPros = recordings.reduce((sum, r) => sum + (r.missedPros || 0), 0);

    console.log('\n📈 Statistics:');
    console.log('Total Recordings:', totalRecordings);
    console.log('Average Score:', avgScore.toFixed(1));
    console.log('Total Missed Pros:', totalMissedPros);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Database Error:', error);
  }
}

debugDatabase();
