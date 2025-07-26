const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// POST /api/members – Add new member
router.post('/', async (req, res) => {
  try {
    const { name, email, role, project } = req.body;

    if (!name || !email || !role || !project) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const newMember = new Member({ name, email, role, project });
    await newMember.save();
    res.status(201).json({ message: "Member added successfully", member: newMember });
  } catch (error) {
    console.error("Add Member Error:", error);
    res.status(500).json({ message: "Server error while adding member." });
  }
});

// GET /api/members – Get all members
router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.status(200).json(members);
  } catch (error) {
    console.error("Fetch Members Error:", error);
    res.status(500).json({ message: "Server error while fetching members." });
  }
});

// GET /api/members/grouped – Group by project
router.get('/grouped', async (req, res) => {
  try {
    const members = await Member.find();

    const grouped = members.reduce((acc, member) => {
      if (!acc[member.project]) acc[member.project] = [];
      acc[member.project].push(member);
      return acc;
    }, {});

    res.status(200).json(grouped);
  } catch (error) {
    console.error("Group Members Error:", error);
    res.status(500).json({ message: "Server error while grouping members." });
  }
});

// ✅ NEW: Validate if user is a registered member
router.get('/validate', async (req, res) => {
  try {
    const email = req.query.email;
    const member = await Member.findOne({ email });

    if (member) {
      res.status(200).json({ valid: true, member });
    } else {
      res.status(200).json({ valid: false });
    }
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
