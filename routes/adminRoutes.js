const express = require("express");
const router = express.Router();
const Recording = require("../models/Recording");

// Helper function to group data by time period
const groupDataByPeriod = (data, period = 'day') => {
  const grouped = {};
  
  data.forEach(item => {
    if (!item.date) return;
    
    const date = new Date(item.date);
    let key;
    
    switch(period) {
      case 'week':
        // Group by ISO week of year (e.g., '2023-W23')
        const weekNum = Math.ceil((((date - new Date(date.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
        break;
      case 'month':
        // Group by year-month (e.g., '2023-05')
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'year':
        // Group by year
        key = date.getFullYear().toString();
        break;
      default: // day
        // Group by date (YYYY-MM-DD)
        key = date.toISOString().slice(0, 10);
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        scores: [],
        count: 0
      };
    }
    
    if (item.score) {
      grouped[key].scores.push(item.score);
    }
    grouped[key].count++;
  });
  
  return grouped;
};

router.get("/dashboard", async (req, res) => {
  const { period = 'day' } = req.query; // 'day', 'week', 'month', or 'year'
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

    // Project-wise top objections - using allRecordings for comprehensive data
    const allProjectsSet = new Set();
    const projectObjectionMap = {};
    
    // First pass: collect all unique projects with at least one recording
    allRecordings.forEach(r => {
      if (r.project) {
        allProjectsSet.add(r.project);
        if (!projectObjectionMap[r.project]) {
          projectObjectionMap[r.project] = {};
        }
      }
    });
    
    // Second pass: count objections across all recordings
    allRecordings.forEach(r => {
      if (r.project && r.topObjection && r.topObjection !== 'None' && r.topObjection !== 'Analysis failed') {
        projectObjectionMap[r.project][r.topObjection] = (projectObjectionMap[r.project][r.topObjection] || 0) + 1;
      }
    });
    
    // If no projects found, check recentRecordings as fallback
    if (allProjectsSet.size === 0) {
      recentRecordings.forEach(r => {
        if (r.project) allProjectsSet.add(r.project);
      });
    }
    const projectObjections = Array.from(allProjectsSet).map(project => {
      const objections = projectObjectionMap[project];
      // Build a sorted array of objections for this project
      const objectionsArr = Object.entries(objections)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      return {
        project,
        objections: objectionsArr.length > 0 ? objectionsArr : [{ name: "None", count: 0 }]
      };
    });

    // Group recordings by selected time period
    const groupedData = groupDataByPeriod(allRecordings, period);
    
    // Convert to array and sort by period
    const pitchTrend = Object.entries(groupedData)
      .map(([periodKey, data]) => {
        const avgScore = data.scores.length > 0 
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0;
          
        return {
          period: periodKey,
          score: avgScore,
          count: data.count,
          label: period === 'day' 
            ? new Date(periodKey).toLocaleDateString('en-US', { weekday: 'short' })
            : periodKey
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
    
    // If no data for the current period, ensure we have at least the current period
    const today = new Date();
    let currentPeriod;
    
    switch(period) {
      case 'week':
        const weekNum = Math.ceil((((today - new Date(today.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
        currentPeriod = `${today.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
        break;
      case 'month':
        currentPeriod = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'year':
        currentPeriod = today.getFullYear().toString();
        break;
      default: // day
        currentPeriod = today.toISOString().slice(0, 10);
    }
    
    if (!groupedData[currentPeriod]) {
      pitchTrend.push({
        period: currentPeriod,
        score: 0,
        count: 0,
        label: period === 'day' 
          ? today.toLocaleDateString('en-US', { weekday: 'short' })
          : currentPeriod
      });
    }

    const chartData = {
      objectionBreakdown: Object.entries(objectionMap).map(([name, count]) => ({ name, count })),
      pitchTrend
    };

    console.log(`📊 Sending response - conversationsToday: ${conversationsToday}, pitchAvg: ${pitchAvg}`);

    res.json({
      conversationsToday,
      pitchAvg,
      topObjections: topObjection,
      totalObjections,
      recent: recentRecordings,
      chartData,
      projectObjections
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
