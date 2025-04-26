import React, { useState, useEffect, useRef } from 'react';
import '../styles/MeetingRoom.css';
import ACTIONS from '../Actions';

const MeetingRoom = ({ isOpen, onClose, roomId, username, socketRef }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});

  useEffect(() => {
    if (isOpen) {
      initializeMedia();
    }
    return () => {
      cleanup();
    };
  }, [isOpen]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setupPeerConnections();
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const setupPeerConnections = () => {
    if (!socketRef.current) return;

    socketRef.current.on(ACTIONS.JOINED, handleUserJoined);
    socketRef.current.on(ACTIONS.OFFER, handleOffer);
    socketRef.current.on(ACTIONS.ANSWER, handleAnswer);
    socketRef.current.on(ACTIONS.ICE_CANDIDATE, handleIceCandidate);
    socketRef.current.on(ACTIONS.DISCONNECTED, handleUserDisconnected);
  };

  const handleUserJoined = async ({ clients }) => {
    for (const client of clients) {
      if (client.socketId !== socketRef.current.id) {
        await createPeerConnection(client.socketId);
      }
    }
  };

  const createPeerConnection = async (socketId) => {
    if (peerConnections.current[socketId]) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peerConnections.current[socketId] = pc;

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.ontrack = (event) => {
      setRemoteStreams(prev => ({
        ...prev,
        [socketId]: event.streams[0]
      }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit(ACTIONS.ICE_CANDIDATE, {
          candidate: event.candidate,
          targetSocketId: socketId
        });
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit(ACTIONS.OFFER, {
        offer,
        targetSocketId: socketId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async ({ offer, socketId }) => {
    const pc = createPeerConnection(socketId);
    peerConnections.current[socketId] = pc;

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketRef.current.emit(ACTIONS.ANSWER, {
      answer,
      targetSocketId: socketId
    });
  };

  const handleAnswer = async ({ answer, socketId }) => {
    const pc = peerConnections.current[socketId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async ({ candidate, socketId }) => {
    const pc = peerConnections.current[socketId];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const handleUserDisconnected = ({ socketId }) => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close();
      delete peerConnections.current[socketId];
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[socketId];
        return newStreams;
      });
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    setRemoteStreams({});
  };

  if (!isOpen) return null;

  return (
    <div className="meeting-room">
      <div className="meeting-header">
        <h3>Meeting Room</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="video-grid">
        <div className="video-container local">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={isVideoOn ? 'video-active' : 'video-inactive'}
          />
          <div className="username-overlay">{username} (You)</div>
        </div>
        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <div key={socketId} className="video-container remote">
            <video
              autoPlay
              playsInline
              ref={video => {
                if (video) video.srcObject = stream;
              }}
            />
            <div className="username-overlay">User {socketId}</div>
          </div>
        ))}
      </div>
      <div className="meeting-controls">
        <button
          className={`control-button ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button
          className={`control-button ${isVideoOn ? 'active' : ''}`}
          onClick={toggleVideo}
          title={isVideoOn ? 'Turn off video' : 'Turn on video'}
        >
          {isVideoOn ? '📹' : '📷'}
        </button>
      </div>
    </div>
  );
};

export default MeetingRoom; 