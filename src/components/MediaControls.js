import React, { useState, useEffect, useRef } from 'react';
import '../styles/MediaControls.css';

const MediaControls = ({ roomId, username }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    // Initialize media devices
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    initMedia();

    // Cleanup
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    // Implement deafen logic here
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

  return (
    <div className="media-controls">
      <div className="video-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={isVideoOn ? 'video-active' : 'video-inactive'}
        />
        <div className="username-overlay">{username}</div>
      </div>
      <div className="controls">
        <button
          className={`control-button ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button
          className={`control-button ${isDeafened ? 'active' : ''}`}
          onClick={toggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? '🔇' : '🎧'}
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

export default MediaControls; 