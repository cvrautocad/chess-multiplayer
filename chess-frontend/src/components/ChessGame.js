import React, { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const ChessGame = () => {
    const [game, setGame] = useState(new Chess());
    const [room, setRoom] = useState("");
    const [playerColor, setPlayerColor] = useState(null); // Track player color

    useEffect(() => {
        socket.on("gameState", ({ fen, turn }) => {
            try {
                const newGame = new Chess();
                newGame.load(fen);
                setGame(newGame);
                console.log("Move received from server:", fen);
    
                // Update whose turn it is
                if (playerColor && playerColor !== turn) {
                    console.log("Opponent's turn. You cannot move.");
                }
            } catch (error) {
                console.error("Error loading game state:", error);
            }
        });
    
        socket.on("assignColor", (color) => {
            setPlayerColor(color);
            console.log(`You are playing as: ${color}`);
        });
    
        // ✅ Handle check alerts from the server
        socket.on("checkAlert", (message) => {
            alert(message);
        });
    
        // ✅ Handle game-over alerts and redirect to Game Over screen
        socket.on("gameOver", ({ message, winner }) => {
            alert(message); // Show alert to both players
            window.location.href = `/game-over?winner=${winner}`; // Redirect to Game Over page
        });
    
        return () => {
            socket.off("gameState");
            socket.off("assignColor");
            socket.off("checkAlert");
            socket.off("gameOver");
        };
    }, [playerColor]);
    
    

    const joinRoom = () => {
        if (room) {
            socket.emit("joinGame", room);
        }
    };

    const onDrop = (sourceSquare, targetSquare) => {
        try {
            if (game.turn() !== playerColor) {
                console.log("Not your turn!");
                return "snapback"; // Prevent move
            }
    
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q", // Always promote to queen
            });
    
            if (!move) return "snapback"; // Invalid move
    
            setGame(new Chess(game.fen())); // Update board
            socket.emit("makeMove", { room, move });
    
            // **Game Over Conditions**
            if (game.isCheckmate()) {
                alert("Checkmate! Game over.");
            } else if (game.isStalemate()) {
                alert("Stalemate! Game drawn.");
            } else if (game.isDraw()) {
                alert("Draw! Game over.");
            } else if (game.isCheck()) {
                alert("Check! Your king is under attack.");
            }
    
        } catch (error) {
            console.error("Invalid move:", error);
            return "snapback"; // Prevents crash
        }
    };
    

    return (
        <div>
            <input
                type="text"
                placeholder="Enter Room ID"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
            />
            <button onClick={joinRoom}>Join Game</button>
            <p>You are playing as: {playerColor || "Waiting..."}</p>
            <Chessboard position={game.fen()} onPieceDrop={onDrop} />
        </div>
    );
};

export default ChessGame;
