# Center Chat Socket.IO Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Add Socket.IO realtime (typing + messages/images), image sharing, and mobile UI sizing for Patient ↔ Diagnostic Center chat without rebuilding existing chat logic.

**Architecture:** REST remains source of truth; Node Socket.IO pushes events; slow poll only as reconnect fallback.

**Tech Stack:** Laravel, Node Socket.IO, React (Vite), MediaStorage

## Global Constraints

- Only Patient ↔ Diagnostic Center chat surfaces
- Keep send/read/online behavior
- Hide footers on active chat screens

---

### Task 1: Realtime Node server

- [ ] Create `realtime/` with package.json, server.js, README
- [ ] Emit HTTP endpoint + Socket.IO join/typing

### Task 2: Backend

- [ ] Migration for message_type + image_path
- [ ] CenterChatService send image + emit
- [ ] Authorize + controllers accept multipart
- [ ] Env keys for socket URL/secret

### Task 3: Frontend

- [ ] socket.io-client + centerChatSocket helper
- [ ] PatientCenterChat + CenterChats: typing, images, socket, fallback poll
- [ ] CSS sizing + mobile shell; hide footers
