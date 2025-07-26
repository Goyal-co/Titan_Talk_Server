const express = require("express");
const router = express.Router();
const Recording = require("../models/Recording");

router.get("/dashboard", async (req, res) => {
  try {
    console.log('🚀 Admin Dashboard API called at:', new Date().toISOString());
    
    // Get ALL recordings (not limited to 50) to properly count today's conversations
    const allRecordings = await Recording.find().sort({ date: -1 });
    const recentRecordings = allRecordings.slice(0, 50); // For display purposes

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().slice(0, 10);
    console.log(`📅 Today's date: ${today}`);
    console.log(`📊 Total recordings found: ${allRecordings.length}`);
    
    // DEFINITIVE FIX: Count conversations from today
    let conversationsToday = 0;
    const todaysRecordings = [];
    
    allRecordings.forEach((recording, index) => {
      if (recording.date) {
        // Convert recording date to YYYY-MM-DD format
        const recordingDateStr = new Date(recording.date).toISOString().slice(0, 10);
        
        if (recordingDateStr === today) {
          conversationsToday++;
          todaysRecordings.push({
            name: recording.name,
            date: recording.date,
            dateStr: recordingDateStr
          });
          console.log(`✅ Found today's recording #${conversationsToday}: ${recording.name} (${recordingDateStr})`);
        }
      }
    });
    
    console.log(`🎯 FINAL COUNT - Conversations today: ${conversationsToday}`);
    console.log(`📋 Today's recordings:`, todaysRecordings);

    // Calculate average pitch score from valid scores only
    const validScores = allRecordings.filter(r => r.score && r.score > 0);
    const pitchAvg = validScores.length
      ? Math.round(validScores.reduce((sum, r) => sum + r.score, 0) / validScores.length)
      : 0;

    // Build objection breakdown for charts
    const objectionMap = {};
    allRecordings.forEach(r => {
      if (r.topObjection && r.topObjection !== 'None' && r.topObjection !== 'Analysis failed') {
        objectionMap[r.topObjection] = (objectionMap[r.topObjection] || 0) + 1;
      }
    });

    const topObjection = Object.entries(objectionMap).sort((a, b) => b[1] - a[1])?.[0]?.[0] || "Need more time to decide";
    const totalObjections = Object.values(objectionMap).reduce((sum, count) => sum + count, 0);

    // Prepare chart data
    const chartData = {
      objectionBreakdown: Object.entries(objectionMap).map(([name, count]) => ({ name, count })),
      pitchTrend: recentRecordings.slice(0, 10).reverse().map((r, index) => ({
        day: `Day ${index + 1}`,
        score: r.score || 0
      }))
    };

    console.log(`📊 Sending response - conversationsToday: ${conversationsToday}, pitchAvg: ${pitchAvg}`);

    res.json({
      conversationsToday,
      pitchAvg,
      topObjections: topObjection,
      totalObjections,
      recent: recentRecordings,
      chartData
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
