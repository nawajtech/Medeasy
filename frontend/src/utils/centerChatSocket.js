import { io } from "socket.io-client";
import { CENTER_CHAT_SOCKET_URL } from "../config/env";

/**
 * Connect to the center-chat Socket.IO server and join a conversation room.
 * Returns controls for typing + cleanup. Falls back silently if URL missing.
 */
export function connectCenterChatSocket({
  token,
  conversationId,
  onMessage,
  onTyping,
  onTypingStop,
  onConnectionChange,
}) {
  if (!CENTER_CHAT_SOCKET_URL || !token || !conversationId) {
    onConnectionChange?.(false);
    return {
      connected: false,
      emitTyping() {},
      emitTypingStop() {},
      disconnect() {},
    };
  }

  let joined = false;
  let typingTimer = null;
  let lastTypingSent = 0;

  const socket = io(CENTER_CHAT_SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1200,
    reconnectionAttempts: 20,
  });

  const notifyConnection = (value) => {
    onConnectionChange?.(Boolean(value));
  };

  const tryJoin = () => {
    socket.emit("join", { conversationId: Number(conversationId) }, (ack) => {
      joined = Boolean(ack?.ok);
      notifyConnection(joined && socket.connected);
    });
  };

  socket.on("connect", () => {
    tryJoin();
  });

  socket.on("disconnect", () => {
    joined = false;
    notifyConnection(false);
  });

  socket.on("connect_error", () => {
    joined = false;
    notifyConnection(false);
  });

  socket.on("message", (payload) => {
    onMessage?.(payload);
  });

  socket.on("typing", (payload) => {
    onTyping?.(payload);
  });

  socket.on("typing_stop", (payload) => {
    onTypingStop?.(payload);
  });

  return {
    get connected() {
      return Boolean(joined && socket.connected);
    },
    emitTyping() {
      if (!joined) return;
      const now = Date.now();
      if (now - lastTypingSent < 400) return;
      lastTypingSent = now;
      socket.emit("typing", { conversationId: Number(conversationId) });
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        socket.emit("typing_stop", { conversationId: Number(conversationId) });
      }, 1200);
    },
    emitTypingStop() {
      if (typingTimer) {
        clearTimeout(typingTimer);
        typingTimer = null;
      }
      if (!joined) return;
      socket.emit("typing_stop", { conversationId: Number(conversationId) });
    },
    disconnect() {
      if (typingTimer) clearTimeout(typingTimer);
      try {
        socket.emit("leave", { conversationId: Number(conversationId) });
      } catch {
        // ignore
      }
      socket.removeAllListeners();
      socket.disconnect();
      notifyConnection(false);
    },
  };
}
