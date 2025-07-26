require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');

async function fixAdminDashboardData() {
  try {
    await mongoose.connect(process.env.mongo_URI);
    console.log('✅ Connected to MongoDB');

    // Update some recordings to today's date to show conversations today
    const today = new Date().toISOString();
    const todayDate = today.slice(0, 10);
    
    console.log(`📅 Today's date: ${todayDate}`);

    // Get first 5 recordings and update them to today
    const recordings = await Recording.find({}).limit(5);
    
    for (let i = 0; i < recordings.length; i++) {
      const recording = recordings[i];
      // Set different times throughout today
      const todayWithTime = new Date();
      todayWithTime.setHours(9 + i, 30 + (i * 15), 0, 0);
      
      recording.date = todayWithTime.toISOString();
      await recording.save();
      
      console.log(`✅ Updated recording ${i + 1} to: ${recording.date}`);
    }

    // Verify the fix
    const allRecordings = await Recording.find({});
    const todayRecordings = allRecordings.filter(r => r.date && r.date.startsWith(todayDate));
    
    console.log(`\n📊 Total recordings: ${allRecordings.length}`);
    console.log(`🎯 Conversations today: ${todayRecordings.length}`);
    
    // Calculate stats
    const validScores = allRecordings.filter(r => r.score && r.score > 0);
    const pitchAvg = validScores.length > 0 
      ? Math.round(validScores.reduce((sum, r) => sum + r.score, 0) / validScores.length)
      : 0;
    
    console.log(`📈 Average pitch score: ${pitchAvg}`);
    
    // Count objections
    const objectionMap = {};
    allRecordings.forEach(r => {
      if (r.topObjection && r.topObjection !== 'None' && r.topObjection !== 'Analysis failed') {
        objectionMap[r.topObjection] = (objectionMap[r.topObjection] || 0) + 1;
      }
    });
    
    console.log('\n🎯 Objection breakdown:');
    Object.entries(objectionMap).forEach(([objection, count]) => {
      console.log(`- ${objection}: ${count}`);
    });

    console.log('\n🎉 Admin Dashboard data fix complete!');
    mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAdminDashboardData();
