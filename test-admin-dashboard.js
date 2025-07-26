require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');

async function testAdminDashboard() {
  try {
    await mongoose.connect(process.env.mongo_URI);
    console.log('✅ Connected to MongoDB');

    const recordings = await Recording.find().sort({ date: -1 }).limit(50);
    console.log(`📊 Total recordings found: ${recordings.length}`);

    // Test today's date logic
    const today = new Date().toISOString().slice(0, 10);
    console.log(`📅 Today's date: ${today}`);

    const todayRecordings = recordings.filter(r => r.date && r.date.startsWith(today));
    console.log(`🎯 Conversations Today: ${todayRecordings.length}`);

    // Show sample dates
    console.log('\n📋 Sample recording dates:');
    recordings.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. ${r.date} (matches today: ${r.date && r.date.startsWith(today)})`);
    });

    // Calculate pitch average
    const validScores = recordings.filter(r => r.score && r.score > 0);
    const pitchAvg = validScores.length
      ? Math.round(validScores.reduce((sum, r) => sum + r.score, 0) / validScores.length)
      : 0;
    console.log(`📈 Pitch Average: ${pitchAvg}`);

    // Count objections
    const objectionMap = {};
    recordings.forEach(r => {
      if (r.topObjection && r.topObjection !== 'None' && r.topObjection !== 'Analysis failed') {
        objectionMap[r.topObjection] = (objectionMap[r.topObjection] || 0) + 1;
      }
    });

    console.log('\n🎯 Top Objections:');
    Object.entries(objectionMap).forEach(([objection, count]) => {
      console.log(`- ${objection}: ${count}`);
    });

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminDashboard();
