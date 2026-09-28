import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.CENTER_CHAT_SOCKET_PORT || 3001);
const SECRET = process.env.CENTER_CHAT_SOCKET_SECRET || "medeasy-center-chat-dev-secret";
const LARAVEL_API = (process.env.LARAVEL_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const CORS_ORIGIN = process.env.CENTER_CHAT_CORS_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "1mb" }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((s) => s.trim()),
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
});

function roomName(conversationId) {
  return `center-chat:${conversationId}`;
}

async function authorize(token, conversationId) {
  const response = await fetch(`${LARAVEL_API}/realtime/center-chat/authorize`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversation_id: Number(conversationId) }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Authorize failed (${response.status})`);
  }

  return response.json();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "center-chat-realtime" });
});

/** Laravel → Node push after a message is persisted. */
app.post("/emit", (req, res) => {
  const secret = req.header("X-Center-Chat-Secret") || req.body?.secret;
  if (secret !== SECRET) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const conversationId = Number(req.body?.conversation_id);
  const event = String(req.body?.event || "message");
  const payload = req.body?.payload ?? {};

  if (!conversationId) {
    return res.status(422).json({ message: "conversation_id required" });
  }

  io.to(roomName(conversationId)).emit(event, payload);
  return res.json({ ok: true });
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }
    socket.data.token = token;
    return next();
  } catch (error) {
    return next(error);
  }
});

io.on("connection", (socket) => {
  socket.on("join", async (data, ack) => {
    try {
      const conversationId = Number(data?.conversationId ?? data?.conversation_id);
      if (!conversationId) {
        throw new Error("conversationId required");
      }

      const auth = await authorize(socket.data.token, conversationId);
      socket.data.actor = {
        actor_type: auth.actor_type,
        actor_id: auth.actor_id,
        conversation_id: conversationId,
      };

      await socket.join(roomName(conversationId));
      if (typeof ack === "function") ack({ ok: true, actor: socket.data.actor });
    } catch (error) {
      if (typeof ack === "function") {
        ack({ ok: false, message: error.message || "Join failed" });
      }
    }
  });

  socket.on("typing", (data) => {
    const conversationId = Number(data?.conversationId ?? data?.conversation_id ?? socket.data.actor?.conversation_id);
    const actor = socket.data.actor;
    if (!conversationId || !actor) return;

    socket.to(roomName(conversationId)).emit("typing", {
      conversation_id: conversationId,
      actor_type: actor.actor_type,
      actor_id: actor.actor_id,
    });
  });

  socket.on("typing_stop", (data) => {
    const conversationId = Number(data?.conversationId ?? data?.conversation_id ?? socket.data.actor?.conversation_id);
    const actor = socket.data.actor;
    if (!conversationId || !actor) return;

    socket.to(roomName(conversationId)).emit("typing_stop", {
      conversation_id: conversationId,
      actor_type: actor.actor_type,
      actor_id: actor.actor_id,
    });
  });

  socket.on("leave", async (data) => {
    const conversationId = Number(data?.conversationId ?? data?.conversation_id);
    if (conversationId) {
      await socket.leave(roomName(conversationId));
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[center-chat-realtime] listening on :${PORT}`);
  console.log(`[center-chat-realtime] Laravel API: ${LARAVEL_API}`);
});
