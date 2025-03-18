import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const GameOver = () => {
    const [searchParams] = useSearchParams();
    const winner = searchParams.get("winner"); // Get winner from URL
    const navigate = useNavigate();

    return (
        <div style={{ textAlign: "center", padding: "50px" }}>
            <h1>Game Over</h1>
            <h2>{winner ? `${winner} Wins! 🎉` : "It's a Draw! 🤝"}</h2>
            <button onClick={() => navigate("/")}>Return to Home</button>
        </div>
    );
};

export default GameOver;
