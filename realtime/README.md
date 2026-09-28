# Center Chat Realtime (Socket.IO)

Push layer for Patient ↔ Diagnostic Center chat.

## Run

```bash
cd realtime
npm install
set CENTER_CHAT_SOCKET_SECRET=medeasy-center-chat-dev-secret
set LARAVEL_API_BASE_URL=http://127.0.0.1:8000/api
npm start
```

Default port: `3001`

## Env

| Variable | Default | Purpose |
|----------|---------|---------|
| `CENTER_CHAT_SOCKET_PORT` | `3001` | Listen port |
| `CENTER_CHAT_SOCKET_SECRET` | `medeasy-center-chat-dev-secret` | Shared with Laravel |
| `LARAVEL_API_BASE_URL` | `http://127.0.0.1:8000/api` | Token authorize |
| `CENTER_CHAT_CORS_ORIGIN` | `*` | Browser origins |

Laravel `.env` must set matching `CENTER_CHAT_SOCKET_URL` + `CENTER_CHAT_SOCKET_SECRET`.
Frontend `.env` must set `VITE_CENTER_CHAT_SOCKET_URL=http://127.0.0.1:3001`.
