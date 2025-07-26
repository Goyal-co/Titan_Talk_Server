require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');

async function updateTodayConversations() {
  try {
    await mongoose.connect(process.env.mongo_URI);
    console.log('✅ Connected to MongoDB');

    // Get today's date in the correct format
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD format
    
    console.log(`📅 Today's date: ${today}`);
    console.log(`📅 Current time: ${now.toISOString()}`);

    // Get all recordings
    const allRecordings = await Recording.find({});
    console.log(`📊 Total recordings found: ${allRecordings.length}`);

    if (allRecordings.length === 0) {
      console.log('❌ No recordings found in database');
      mongoose.connection.close();
      return;
    }

    // Update first 5 recordings to today's date with different times
    const recordingsToUpdate = allRecordings.slice(0, 5);
    
    for (let i = 0; i < recordingsToUpdate.length; i++) {
      const recording = recordingsToUpdate[i];
      
      // Create different times throughout today
      const todayWithTime = new Date();
      todayWithTime.setHours(9 + i, 30 + (i * 10), 0, 0);
      
      const oldDate = recording.date;
      recording.date = todayWithTime.toISOString();
      
      await recording.save();
      
      console.log(`✅ Updated recording ${i + 1}:`);
      console.log(`   Old date: ${oldDate}`);
      console.log(`   New date: ${recording.date}`);
      console.log(`   Date prefix: ${recording.date.slice(0, 10)}`);
    }

    // Verify the update
    const updatedRecordings = await Recording.find({});
    const todayRecordings = updatedRecordings.filter(r => r.date && r.date.startsWith(today));
    
    console.log(`\n📊 Verification:`);
    console.log(`   Total recordings: ${updatedRecordings.length}`);
    console.log(`   Conversations today: ${todayRecordings.length}`);
    
    // Show all dates for debugging
    console.log(`\n📅 All recording dates:`);
    updatedRecordings.forEach((r, index) => {
      const datePrefix = r.date ? r.date.slice(0, 10) : 'NO DATE';
      const isToday = r.date && r.date.startsWith(today);
      console.log(`   ${index + 1}. ${datePrefix} ${isToday ? '✅ TODAY' : ''}`);
    });

    console.log('\n🎉 Date update complete!');
    mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
}

updateTodayConversations();
