require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');

async function fixConversationsToday() {
  try {
    await mongoose.connect(process.env.mongo_URI);
    console.log('✅ Connected to MongoDB');

    // Get all recordings
    const allRecordings = await Recording.find().sort({ date: -1 });
    console.log(`📊 Total recordings: ${allRecordings.length}`);

    // Get today's date
    const today = new Date().toISOString().slice(0, 10);
    console.log(`📅 Today's date: ${today}`);

    // Debug each recording's date
    console.log('\n📅 Analyzing all recording dates:');
    let todayCount = 0;
    
    allRecordings.forEach((r, index) => {
      if (r.date) {
        const recordingDate = new Date(r.date).toISOString().slice(0, 10);
        const isToday = recordingDate === today;
        
        console.log(`${index + 1}. ${r.name} - Date: ${recordingDate} ${isToday ? '✅ TODAY' : ''}`);
        
        if (isToday) {
          todayCount++;
        }
      } else {
        console.log(`${index + 1}. ${r.name} - NO DATE`);
      }
    });

    console.log(`\n🎯 Manual count of today's conversations: ${todayCount}`);

    // Test the exact logic from admin routes
    const conversationsToday = allRecordings.filter(r => {
      if (!r.date) return false;
      const recordingDate = new Date(r.date).toISOString().slice(0, 10);
      const isToday = recordingDate === today;
      return isToday;
    }).length;

    console.log(`🔧 Admin routes logic result: ${conversationsToday}`);

    if (conversationsToday === 0 && todayCount > 0) {
      console.log('❌ ISSUE: Manual count shows recordings but admin logic returns 0');
      console.log('🔧 Checking date formats...');
      
      // Check the first few today's recordings
      const todaysRecordings = allRecordings.filter(r => {
        if (!r.date) return false;
        const recordingDate = new Date(r.date).toISOString().slice(0, 10);
        return recordingDate === today;
      });

      console.log('\n📋 Today\'s recordings details:');
      todaysRecordings.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}`);
        console.log(`   Original date: ${r.date}`);
        console.log(`   Date type: ${typeof r.date}`);
        console.log(`   Converted: ${new Date(r.date).toISOString().slice(0, 10)}`);
        console.log('');
      });
    }

    mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixConversationsToday();
