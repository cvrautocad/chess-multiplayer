const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { Chess } = require("chess.js");
const cors = require("cors");
const { PeerServer } = require("peer");

//adding mongodb
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");
const chatRoutes=require("./routes/chatRoutes");
/////////

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Middleware for parsing JSON
app.use(express.json());
app.use(cors());
//chatRoutes
app.use("/api/messages", chatRoutes);

const peerServer = PeerServer({ port: 9000, path: "/" });
console.log("PeerJS Server running on port 9000");

let games = {}; // Store active games

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinGame", (room) => {
        socket.join(room);
        if (!games[room]) {
            games[room] = { game: new Chess(), players: [] };
        }

        const roomData = games[room];
        if (roomData.players.length < 2) {
            const assignedColor = roomData.players.length === 0 ? "w" : "b";
            roomData.players.push({ id: socket.id, color: assignedColor });

            socket.emit("assignColor", assignedColor);
            console.log(`Player ${socket.id} assigned color: ${assignedColor}`);
        }

        io.to(room).emit("gameState", {
            fen: roomData.game.fen(),
            turn: roomData.game.turn(),
        });
    });

    socket.on("makeMove", ({ room, move }) => {
        try {
            const roomData = games[room];
            if (!roomData) {
                console.error(`No game found for room: ${room}`);
                return;
            }
    
            const game = roomData.game;
            const validMove = game.move(move);
    
            if (!validMove) {
                console.warn(`Invalid move attempted in room ${room}:`, move);
                return;
            }
    
            // Send new game state and turn
            io.to(room).emit("gameState", {
                fen: game.fen(),
                turn: game.turn(),
            });
    
            // Check game over conditions
            if (game.isCheckmate()) {
                const winner = game.turn() === "w" ? "Black" : "White"; // Opponent wins
                io.to(room).emit("gameOver", { message: `Checkmate! ${winner} wins.`, winner });
            } else if (game.isStalemate()) {
                io.to(room).emit("gameOver", { message: "Stalemate! Game drawn.", winner: "draw" });
            } else if (game.isDraw()) {
                io.to(room).emit("gameOver", { message: "Draw! Game over.", winner: "draw" });
            } else if (game.isCheck()) {
                io.to(room).emit("checkAlert", "Check! Your king is under attack.");
            }
        } catch (error) {
            console.error("Error processing move:", error);
        }
    });
    
    // adding chat system code
    let users = {};
     // When a user joins, store their ID
     socket.on("joinChat", async (userId) => {
        users[userId] = socket.id;
        console.log("Users after joinChat:", users);
    
        // ✅ Send updated user list to all clients
        io.emit("updateUsers", Object.keys(users));
    
        try {
            // ✅ Fetch undelivered messages for the user
            const undeliveredMessages = await Message.find({ receiver: userId });
    
            // ✅ Send undelivered messages to the user
            undeliveredMessages.forEach((msg) => {
                io.to(socket.id).emit("receiveMessage", msg);
            });
    
            console.log(`📨 Sent ${undeliveredMessages.length} undelivered messages to ${userId}`);
        } catch (error) {
            console.error("❌ Error fetching undelivered messages:", error);
        }
    });
    

    // Handle chat messages
    //changing at 5pm
    socket.on("sendMessage", async ({ sender, receiver, text }) => {
        console.log(`📩 Message from ${sender} to ${receiver}:`, text);
    
        try {
            // ✅ Save the message in MongoDB
            const newMessage = new Message({ sender, receiver, text });
            await newMessage.save();
            console.log("✅ Message saved in MongoDB");
    
            // ✅ Debug: Check if receiver is online
            console.log(`👥 Active Users:`, users);
    
            // ✅ Send message via Socket.io (if receiver is online)
            if (users[receiver]) {
                console.log(`📡 Sending message to ${receiver}`);
                io.to(users[receiver]).emit("receiveMessage", { sender, receiver, text });
                console.log(`📨 Message sent to online user: ${receiver}`);
            } else {
                console.log(`🚫 Receiver (${receiver}) is offline`);
            }
        } catch (error) {
            console.error("❌ Error saving message:", error);
        }
    });
    
    

    // Handle game invitations
    socket.on("invitePlayer", ({ fromUser, toUser }) => {
        console.log(`🎮 Server received game invite from ${fromUser} to ${toUser}`);
        
        if (users[toUser]) {
            io.to(users[toUser]).emit("invitePlayer", { fromUser });
            console.log(`📨 Sending game invite to ${toUser}`);
        } else {
            console.log(`❌ User ${toUser} is offline, cannot send invite.`);
        }
    });
    

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    
        // Find and remove the user from the active users list
        const userId = Object.keys(users).find((id) => users[id] === socket.id);
        if (userId) {
            delete users[userId]; // Remove user from the list
            console.log(`User ${userId} removed from active users.`);
        }
    
        // Notify all clients about the updated user list
        io.emit("updateUsers", Object.keys(users));
    });
    
    
});


//giving mongodb connection
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch((err) => console.error("MongoDB connection error:", err));

// Define User Schema
// const userSchema = new mongoose.Schema({
//     username: { type: String, required: true, unique: true },
//     email: { type: String, required: true, unique: true }, // Only email is unique
//     password: { type: String, required: true }
// });

// const User = mongoose.model("User", userSchema);


// User Registration
app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if the username or email already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.json({ message: "User registered successfully" });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// User Login
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, "secretkey", { expiresIn: "1h" });
        // Send userId in response along with the token
        res.json({ token, userId: user._id, username: user.username });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Protected Route (Example)
app.get("/profile", async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, "secretkey");
        const user = await User.findById(decoded.id).select("-password");

        res.json(user);
    } catch (err) {
        res.status(401).json({ message: "Unauthorized" });
    }
});
////////////////////

//////////////////////
app.get("/api/users", async (req, res) => {
    try {
        const users = await User.find({}, "username email"); // Fetch users, exclude passwords
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
////////////////////

////////////////////
app.post("/api/messages", async (req, res) => {
    try {
        const { sender, receiver, text } = req.body;

        if (!sender || !receiver || !text) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const newMessage = new Message({ sender, receiver, text });
        await newMessage.save();

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("❌ Error saving message:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ API Route to Fetch Messages (GET)
app.get("/api/messages", async (req, res) => {
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (error) {
        console.error("❌ Error fetching messages:", error);
        res.status(500).json({ message: "Server error" });
    }
});

////////////////////////
//////////
app.get("/api/messages/:userId/:selectedUser", async (req, res) => {
    try {
        const { userId, selectedUser } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: selectedUser },
                { sender: selectedUser, receiver: userId }
            ]
        }).sort({ timestamp: 1 }); // Sort messages in chronological order
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Error fetching messages" });
    }
});
////////////
server.listen(5000, () => console.log("Server running on port 5000"));
