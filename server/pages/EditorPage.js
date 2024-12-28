/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [codelang, setCodelang] = useState("javascript");

  useEffect(() => {
    const init = async () => {
      if (!socketRef.current) {
        socketRef.current = await initSocket();
        socketRef.current.on("connect_error", (err) => handleErrors(err));
        socketRef.current.on("connect_failed", (err) => handleErrors(err));

        function handleErrors(e) {
          console.log("socket error", e);
          toast.error("Socket connection failed, try again later.");
          reactNavigator("/access");
        }

        socketRef.current.emit(ACTIONS.JOIN, {
          roomId,
          username: location.state?.username,
        });

        // Listening for joined event
        socketRef.current.on(
          ACTIONS.JOINED,
          ({ clients, username, socketId }) => {
            if (username !== location.state?.username) {
              toast.success(`${username} joined the room.`);
              console.log(`${username} joined`);
            }
            setClients(clients);
            socketRef.current.emit(ACTIONS.SYNC_CODE, {
              code: codeRef.current,
              socketId,
            });
          }
        );

        // Listening for disconnected
        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
          toast.success(`${username} left the room.`);
          setClients((prev) => {
            return prev.filter((client) => client.socketId !== socketId);
          });
        });

        // Listening for language change
        socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
          setCodelang(language);
        });
      }
    };
    init();
    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [location.state?.username, reactNavigator, roomId]);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
      console.error(err);
    }
  }

  const shareRoomId = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: `Join the DevCraft room with ID: ${roomId}`,
        });
        toast.success("Room ID shared successfully!");
      } catch (err) {
        toast.error("Error sharing the room ID. Please try again.");
      }
    } else {
      toast.error(
        "Your browser does not support native sharing. Room ID has been copied to your clipboard."
      );
      copyRoomId();
    }
  };

  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/access" />;
  }

  const handleLanguageChange = (language) => {
    setCodelang(language);
    socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
      roomId,
      language,
    });
  };

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img
              className="logoImage"
              src="/devcrafttext.png"
              alt="devcraft logo"
            />
          </div>
          <div className="statusContainer">
            <h3 className="liveStatustext">Status:</h3> &nbsp;
            <h3 className="liveStatus">Live!</h3>
          </div>
          <hr className="customHrDashed" />
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <hr className="customHrGradient" />
        <button className="copyBtn" onClick={copyRoomId}>
          <img
            src="/copy.png"
            alt="Copy"
            style={{
              width: "16px",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Copy Room ID
        </button>
        <button className="shareBtn" onClick={shareRoomId}>
          <img
            src="/send.png"
            alt="Send"
            style={{
              width: "16px",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Share Room ID
        </button>
        <button className="leaveBtn" onClick={leaveRoom}>
          <img
            src="/logout.png"
            alt="Logout"
            style={{
              width: "16px",
              marginRight: "8px",
              verticalAlign: "middle",
            }}
          />
          Leave Room
        </button>
      </div>
      <div className="editorwrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
          }}
          codelang={codelang}
          onLanguageChange={handleLanguageChange}
        />
      </div>
    </div>
  );
};

export default EditorPage;
