const express = require("express");
const router = express.Router();
const ProjectProsCons = require("../models/ProjectProsCons");

// GET: Fetch pros/cons for a project
router.get("/", async (req, res) => {
  try {
    const { project } = req.query;
    if (!project) return res.status(400).json({ message: "Project is required" });

    const data = await ProjectProsCons.findOne({ project });
    res.status(200).json(data || { pros: [], objections: [] });
  } catch (err) {
    console.error("Fetch pros/cons error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST: Create or update pros/cons for a project
router.post("/", async (req, res) => {
  try {
    const { project, pros, objections } = req.body;

    if (!project) return res.status(400).json({ message: "Project is required" });

    const updated = await ProjectProsCons.findOneAndUpdate(
      { project },
      { pros, objections },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Pros & objections saved", data: updated });
  } catch (err) {
    console.error("Save pros/cons error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
