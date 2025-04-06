import React, { useEffect, useState } from "react";
import axios from "axios";

const Profile = () => {
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");

    const [stats, setStats] = useState({
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await axios.get(`http://localhost:5000/api/profile/${userId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setStats({
                    matchesPlayed: res.data.matchesPlayed,
                    matchesWon: res.data.matchesWon,
                    matchesLost: res.data.matchesLost,
                });
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError("Failed to load profile stats.");
                setLoading(false);
            }
        };

        if (userId) {
            fetchStats();
        }
    }, [userId]);

    if (!username || !userId) return <p>You're not logged in.</p>;
    if (loading) return <p>Loading profile...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div>
            <h2>Profile</h2>
            <p><strong>Username:</strong> {username}</p>
            <p><strong>User ID:</strong> {userId}</p>
            <hr />
            <p><strong>Matches Played:</strong> {stats.matchesPlayed}</p>
            <p><strong>Matches Won:</strong> {stats.matchesWon}</p>
            <p><strong>Matches Lost:</strong> {stats.matchesLost}</p>
        </div>
    );
};

export default Profile;
