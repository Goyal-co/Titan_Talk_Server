require('dotenv').config();
const mongoose = require('mongoose');
const Recording = require('./models/Recording');

async function testAdminAPI() {
  try {
    await mongoose.connect(process.env.mongo_URI);
    console.log('✅ Connected to MongoDB');

    // Simulate the admin dashboard API logic
    const allRecordings = await Recording.find().sort({ date: -1 });
    const today = new Date().toISOString().slice(0, 10);
    
    console.log(`📅 Today's date: ${today}`);
    console.log(`📊 Total recordings: ${allRecordings.length}`);
    
    // Check each recording's date
    console.log('\n📅 Recording dates:');
    allRecordings.forEach((r, index) => {
      const datePrefix = r.date ? r.date.slice(0, 10) : 'NO DATE';
      const isToday = r.date && r.date.startsWith(today);
      console.log(`${index + 1}. ${datePrefix} ${isToday ? '✅ TODAY' : ''}`);
    });
    
    const conversationsToday = allRecordings.filter(r => r.date && r.date.startsWith(today)).length;
    
    console.log(`\n🎯 RESULT: Conversations Today = ${conversationsToday}`);
    
    // Test the actual API endpoint
    console.log('\n🔄 Testing actual API endpoint...');
    const express = require('express');
    const app = express();
    
    // Simulate the API call
    const validScores = allRecordings.filter(r => r.score && r.score > 0);
    const pitchAvg = validScores.length
      ? Math.round(validScores.reduce((sum, r) => sum + r.score, 0) / validScores.length)
      : 0;

    const objectionMap = {};
    allRecordings.forEach(r => {
      if (r.topObjection && r.topObjection !== 'None' && r.topObjection !== 'Analysis failed') {
        objectionMap[r.topObjection] = (objectionMap[r.topObjection] || 0) + 1;
      }
    });

    const topObjection = Object.entries(objectionMap).sort((a, b) => b[1] - a[1])?.[0]?.[0] || "Need more time to decide";

    const apiResponse = {
      conversationsToday,
      pitchAvg,
      topObjections: topObjection,
      recent: allRecordings.slice(0, 50)
    };

    console.log('📊 API Response would be:');
    console.log(`   conversationsToday: ${apiResponse.conversationsToday}`);
    console.log(`   pitchAvg: ${apiResponse.pitchAvg}`);
    console.log(`   topObjections: ${apiResponse.topObjections}`);
    console.log(`   recent count: ${apiResponse.recent.length}`);

    mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAdminAPI();
