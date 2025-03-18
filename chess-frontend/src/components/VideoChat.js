import React, { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

const VideoChat = ({ room }) => {
    const [peerId, setPeerId] = useState("");
    const [remotePeerId, setRemotePeerId] = useState("");
    const peerRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const userVideoRef = useRef(null);

    useEffect(() => {
        const peer = new Peer();
        peer.on("open", (id) => {
            setPeerId(id);
        });

        peer.on("call", (call) => {
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then((stream) => {
                    userVideoRef.current.srcObject = stream;
                    call.answer(stream);
                    call.on("stream", (remoteStream) => {
                        remoteVideoRef.current.srcObject = remoteStream;
                    });
                });
        });

        peerRef.current = peer;
    }, []);

    const callPeer = () => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((stream) => {
                userVideoRef.current.srcObject = stream;
                const call = peerRef.current.call(remotePeerId, stream);
                call.on("stream", (remoteStream) => {
                    remoteVideoRef.current.srcObject = remoteStream;
                });
            });
    };

    return (
        <div>
            <h3>Your ID: {peerId}</h3>
            <input
                type="text"
                placeholder="Enter Remote ID"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
            />
            <button onClick={callPeer}>Call</button>
            <div style={{ display: "flex", gap: "10px" }}>
                <video ref={userVideoRef} autoPlay playsInline />
                <video ref={remoteVideoRef} autoPlay playsInline />
            </div>
        </div>
    );
};

export default VideoChat;
