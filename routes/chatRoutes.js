const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// ✅ Fetch chat history between two users
router.get("/messages/:userId/:selectedUser", async (req, res) => {
    const { userId, selectedUser } = req.params;
    
    try {
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: selectedUser },
                { sender: selectedUser, receiver: userId }
            ]
        }).sort({ timestamp: 1 }); // Sort by oldest first
        
        res.json(messages);
    } catch (err) {
        console.error("❌ Error fetching chat history:", err);
        res.status(500).json({ error: "Error fetching messages" });
    }
});

// ✅ Store a new message
router.post("/messages", async (req, res) => {
    const { sender, receiver, text } = req.body;

    try {
        const newMessage = new Message({ sender, receiver, text });
        await newMessage.save();
        
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ error: "Error saving message" });
    }
});

module.exports = router;
