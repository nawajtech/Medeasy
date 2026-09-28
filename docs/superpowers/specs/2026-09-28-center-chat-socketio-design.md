# Center Chat Socket.IO + Images + UI Design

**Date:** 2026-09-28  
**Scope:** Patient ↔ Diagnostic Center chat only  
**Approach:** B — REST source of truth + Socket.IO push

## Architecture

- Laravel persists messages (text/image) via existing center-chat APIs.
- After successful send, Laravel POSTs to a Node Socket.IO emit endpoint.
- Clients join room `center-chat:{conversationId}` after token authorize.
- Connected clients receive `message`, `typing`, `typing_stop`.
- While socket connected: no 2s poll. On disconnect: slow fallback poll (~12s).

## Data

- `center_messages.message_type`: `text` | `image`
- `center_messages.image_path`: nullable storage path
- Payload adds `type`, `image_url`

## UI

- Staff chat ~+50% sizing; patient chat slightly larger
- Mobile: header fixed, messages scroll, composer fixed; hide page footers on chat screens
- Typing labels; image pick + preview + bubble display
