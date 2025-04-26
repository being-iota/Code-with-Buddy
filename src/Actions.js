const ACTIONS = {
  JOIN: "join",
  JOINED: "joined",
  DISCONNECTED: "disconnected",
  CODE_CHANGE: "code-change",
  SYNC_CODE: "sync-code",
  LEAVE: "leave",
  LANGUAGE_CHANGE: "language-change",
  CHAT_MESSAGE: "chat-message",
  // WebRTC actions
  ICE_CANDIDATE: "ice-candidate",
  OFFER: "offer",
  ANSWER: "answer",
};

module.exports = ACTIONS;
