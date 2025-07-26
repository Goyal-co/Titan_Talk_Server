require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');

async function updateRecordingDates() {
  try {
    await mongoose.connect(process.env.mongo_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date
    const today = new Date().toISOString();
    console.log('📅 Today:', today);

    // Update first 3 recordings to today's date
    const recordings = await Recording.find({}).limit(3);
    
    for (let recording of recordings) {
      recording.date = today;
      await recording.save();
      console.log(`✅ Updated recording ${recording._id} to today's date`);
    }

    console.log('🎉 Date update complete!');
    mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateRecordingDates();
