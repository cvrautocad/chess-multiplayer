import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const navigate = useNavigate();

    return (
        <div>
            <h2>Welcome to the Dashboard</h2>
            <button onClick={() => navigate("/")}>Start Game</button>
            <button onClick={() => navigate("/chat")}>Go to Chat</button>
        </div>
    );
};

export default Dashboard;
