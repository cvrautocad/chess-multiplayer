import axios from "axios"; // Import axios for API requests
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // Connect to backend

const Chat = () => {
    const navigate = useNavigate();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [userId, setUserId] = useState(localStorage.getItem("userId") || ""); // User's unique ID
    const [selectedUser, setSelectedUser] = useState("");
    const [messageCount, setMessageCount] = useState(0); // Force re-render

    useEffect(() => {
        if (userId) {
            socket.emit("joinChat", userId);
            console.log("✅ Joining chat with userId:", userId); // Debugging
        }
    
        // ✅ Fetch users from MongoDB when component loads
        axios.get("http://localhost:5000/api/users")
            .then((res) => {
                console.log("✅ Fetched Users from MongoDB:", res.data);
                setUsers(res.data);
            })
            .catch((err) => console.error("❌ Error fetching users:", err));
    
        // ✅ Listen for updates from Socket.io
        socket.on("updateUsers", (userList) => {
            console.log("🔄 Updated Users from Socket.io:", userList);
            setUsers((prevUsers) => [...new Set([...prevUsers, ...userList])]);
        });
    
        // ✅ Listen for incoming messages
        socket.on("receiveMessage", (data) => {
            console.log(`📩 Received message:`, data);
    
            if (
                (data.receiver === userId || data.sender === userId) &&
                (data.sender === selectedUser || data.receiver === selectedUser)
            ) {
                setMessages((prev) => [...prev, data]);
                setMessageCount((count) => count + 1); // 🔄 Force re-render
            }
        });
    
        // ✅ Listen for game invites
        socket.on("invitePlayer", ({ fromUser }) => {
            console.log(`🎮 Received game invite from ${fromUser}`);
            if (window.confirm(`${fromUser} invited you to play! Accept?`)) {
                navigate("/"); // Redirect to game page
            }
        });
    
        return () => {
            console.log("❌ Cleaning up event listeners...");
            socket.off("receiveMessage");
            socket.off("updateUsers");
            socket.off("invitePlayer"); // ✅ Corrected cleanup
        };
    }, [userId, selectedUser, navigate]);
    
    

// ✅ Step 2: Fetch chat history when a user is selected
useEffect(() => {
    if (selectedUser && userId) {
        axios.get(`http://localhost:5000/api/messages/${userId}/${selectedUser}`)
            .then((res) => {
                console.log("📜 Chat History:", res.data);
                setMessages(res.data);
            })
            .catch((err) => console.error("❌ Error fetching chat history:", err));
    }
}, [userId, selectedUser]);  // ✅ Now updates when userId changes too


    
    

    const sendMessage = async () => {
        if (!message.trim() || !selectedUser) {
            alert("Please select a user to chat with!");
            return;
        }
    
        const newMessage = {
            sender: userId,
            receiver: selectedUser,
            text: message
        };
    
        try {
            console.log("📤 Sending message to backend:", newMessage);
    
            // ✅ Store message in MongoDB
            const response = await axios.post("http://localhost:5000/api/messages", newMessage);
    
            console.log("✅ Message saved in MongoDB:", response.data);
    
            // ✅ Emit message via socket
            socket.emit("sendMessage", newMessage);
    
            // ✅ Update UI immediately
            setMessages((prev) => [...prev, newMessage]);
            setMessage("");
        } catch (error) {
            console.error("❌ Error sending message:", error);
        }
    };
    
    

    const invitePlayer = () => {
        if (selectedUser) {
            console.log(`🎮 Clicking button... Sending invite from ${userId} to ${selectedUser}`);
            socket.emit("invitePlayer", { fromUser: userId, toUser: selectedUser });
            console.log(`🎮 Game invite sent from ${userId} to ${selectedUser}`);
            alert(`Game invite sent to ${selectedUser}`);
        } else {
            console.log("❌ No selected user found!");
        }
    };

    return (
        <div>
            <h2>Chat System</h2>
            <div style={{ border: "1px solid black", padding: "10px", height: "200px", overflowY: "auto" }}>
                {messages.map((msg, index) => (
                    <p key={index}><strong>{msg.sender || "Unknown User"}:</strong> {msg.text}</p>
                ))}
            </div>

            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={!selectedUser}
            />
            <button onClick={sendMessage} disabled={!selectedUser}>Send</button>

            <h3>Online Users</h3>
            <ul>
                {users.map((user) => (
                    <li key={user._id}>
                        {user.username} ({user.email})
                        {user._id !== userId && (
                            <button onClick={() => setSelectedUser(user._id)}>Chat</button>
                        )}
                    </li>
                ))}
            </ul>

            <h3>Chat with {selectedUser || "Select a user"}</h3>
            <div style={{ border: "1px solid black", padding: "10px", height: "200px", overflowY: "auto" }}>
                {messages.map((msg, index) => (
                    <p key={index}>
                        <strong>{msg.sender || "Unknown User"}:</strong> {msg.text}
                    </p>
                ))}
            </div>

            <button onClick={invitePlayer} disabled={!selectedUser}>Send Game Invite</button>
            <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
        </div>
    );
};

export default Chat;
