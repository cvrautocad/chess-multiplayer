import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChessGame from "./components/ChessGame";
import VideoChat from "./components/VideoChat";
import GameOver from "./components/GameOver";
import Register from "./pages/Register"; // ✅ Import Register Page
import Login from "./pages/Login"; // ✅ Import Login Page
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";

function App() {
    return (
        <Router>
            <div className="App">
                <h1>Multiplayer Chess with Video Chat</h1>
                <Routes>
                    {/* Home Route */}
                    <Route path="/" element={<MainGame />} />

                    {/* Game Over Page */}
                    <Route path="/game-over" element={<GameOver />} />

                    {/* Auth Routes */}
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/chat" element={<Chat />} />
                </Routes>
            </div>
        </Router>
    );
}

// Extracted MainGame component
const MainGame = () => {
    const [room, setRoom] = useState("");

    return (
        <>
            <input
                type="text"
                placeholder="Enter Room ID"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
            />
            <ChessGame room={room} />
            <VideoChat room={room} />
        </>
    );
};

export default App;
