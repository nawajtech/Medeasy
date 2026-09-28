import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../utils/apiError";
import { applyChatRead, formatChatListTime, formatChatTime, mergeChatMessages } from "../utils/chatFormat";
import { connectCenterChatSocket } from "../utils/centerChatSocket";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  getStaffCenterChat,
  listStaffCenterChats,
  sendStaffCenterChatMessage,
} from "../api/centerChats";
import "./CenterChats.css";

const FALLBACK_POLL_MS = 12000;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function Ticks({ read }) {
  return (
    <span className={`cc-tick${read ? " is-read" : ""}`} aria-label={read ? "Read" : "Sent"}>
      {read ? "✓✓" : "✓"}
    </span>
  );
}

export default function CenterChats() {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [socketLive, setSocketLive] = useState(false);
  const scroller = useRef(null);
  const fileInput = useRef(null);
  const afterRef = useRef(0);
  const socketRef = useRef(null);
  const typingHideRef = useRef(null);
  const conversationRef = useRef(null);
  const [openedId, setOpenedId] = useState(null);

  if (activeId !== openedId) {
    setOpenedId(activeId);
    setPeerTyping(false);
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    if (activeId) {
      setLoadingThread(true);
      setMessages([]);
    } else {
      setLoadingThread(false);
      setConversation(null);
      setMessages([]);
    }
  }

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await listStaffCenterChats();
        if (!active) return;
        setChats(data?.data ?? []);
        setError("");
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load chats."));
      } finally {
        if (active) setLoadingList(false);
      }
    };
    load();
    const timer = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    let active = true;
    afterRef.current = 0;

    (async () => {
      try {
        const { data } = await getStaffCenterChat(activeId, { mark_read: 1 });
        if (!active) return;
        const nextMessages = data.messages ?? [];
        setConversation(data.conversation);
        setMessages(nextMessages);
        afterRef.current = nextMessages.at(-1)?.id ?? 0;
        setError("");
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not open this chat."));
      } finally {
        if (active) setLoadingThread(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [activeId]);

  useEffect(() => {
    if (!conversation?.id) return undefined;

    const token = localStorage.getItem("apna_medi_token");
    const socket = connectCenterChatSocket({
      token,
      conversationId: conversation.id,
      onConnectionChange: setSocketLive,
      onMessage: (payload) => {
        const incoming = payload?.message;
        const nextConversation = payload?.conversation;
        if (nextConversation) {
          setConversation(nextConversation);
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === nextConversation.id
                ? { ...chat, ...nextConversation, unread_count: 0 }
                : chat
            )
          );
        }
        if (!incoming?.id) return;
        afterRef.current = Math.max(afterRef.current, incoming.id);
        setMessages((current) =>
          applyChatRead(mergeChatMessages(current, [incoming]), nextConversation || conversationRef.current)
        );
        setPeerTyping(false);
      },
      onTyping: (payload) => {
        if (payload?.actor_type === "patient") {
          setPeerTyping(true);
          if (typingHideRef.current) clearTimeout(typingHideRef.current);
          typingHideRef.current = setTimeout(() => setPeerTyping(false), 2500);
        }
      },
      onTypingStop: (payload) => {
        if (payload?.actor_type === "patient") setPeerTyping(false);
      },
    });
    socketRef.current = socket;

    return () => {
      if (typingHideRef.current) clearTimeout(typingHideRef.current);
      socket.disconnect();
      socketRef.current = null;
      setSocketLive(false);
    };
  }, [conversation?.id]);

  useEffect(() => {
    if (!conversation?.id || socketLive) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const { data } = await getStaffCenterChat(conversation.id, {
          after: afterRef.current || undefined,
          mark_read: 1,
        });
        if (!active) return;
        setConversation(data.conversation);
        const incoming = data.messages ?? [];
        if (incoming.length) afterRef.current = incoming.at(-1).id;
        setMessages((current) => {
          const merged = applyChatRead(mergeChatMessages(current, incoming), data.conversation);
          const unchanged =
            merged.length === current.length &&
            merged.every(
              (message, index) =>
                message.id === current[index]?.id && message.read === current[index]?.read
            );
          return unchanged ? current : merged;
        });
      } catch {
        // Keep the open thread if a poll fails.
      }
    };
    const timer = setInterval(poll, FALLBACK_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversation?.id, socketLive]);

  const lastMessageId = messages.at(-1)?.id;
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lastMessageId, loadingThread, peerTyping, imagePreview]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const handlePickImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    socketRef.current?.emitTyping();
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if ((!body && !imageFile) || !conversation || sending) return;
    setSending(true);
    setError("");
    socketRef.current?.emitTypingStop();
    try {
      let payload;
      if (imageFile) {
        payload = new FormData();
        if (body) payload.append("body", body);
        payload.append("image", imageFile);
      } else {
        payload = { body };
      }
      const { data } = await sendStaffCenterChatMessage(conversation.id, payload);
      setDraft("");
      clearImage();
      setConversation(data.conversation);
      setMessages((prev) => applyChatRead(mergeChatMessages(prev, [data.message]), data.conversation));
      afterRef.current = Math.max(afterRef.current, data.message?.id ?? 0);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === data.conversation.id ? { ...chat, ...data.conversation, unread_count: 0 } : chat
        )
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send the message."));
    } finally {
      setSending(false);
    }
  };

  const online = Boolean(conversation?.patient_online);
  const canSend = Boolean(conversation) && !sending && !loadingThread && (draft.trim() || imageFile);

  return (
    <div className={`cc-page${activeId ? " has-thread" : ""}`}>
      <aside className="cc-list">
        <header className="cc-list__head">
          <h1>Patient chats</h1>
          <p>Messages from patients to this centre.</p>
        </header>
        {error && !activeId ? <p className="cc-error">{error}</p> : null}
        {loadingList ? <p className="cc-empty">Loading chats…</p> : null}
        {!loadingList && !error && chats.length === 0 ? (
          <p className="cc-empty">No conversations yet. They appear here when a patient starts a chat.</p>
        ) : null}
        <ul>
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                className={chat.id === activeId ? "is-active" : undefined}
                onClick={() => setActiveId(chat.id)}
              >
                <span className={`cc-dot${chat.patient_online ? " is-online" : ""}`} aria-hidden="true" />
                <span className="cc-list__body">
                  <strong>{chat.patient_name}</strong>
                  <span>{chat.last_message_preview || "No messages yet"}</span>
                </span>
                <span className="cc-list__side">
                  <time>{formatChatListTime(chat.last_message_at)}</time>
                  {chat.unread_count > 0 ? (
                    <span className="cc-badge">{chat.unread_count > 9 ? "9+" : chat.unread_count}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="cc-thread" aria-label="Conversation">
        {!activeId ? <p className="cc-empty">Select a conversation to reply.</p> : null}
        {activeId ? (
          <>
            <header className="cc-thread__head">
              <button type="button" className="cc-back" onClick={() => setActiveId(null)}>
                ← Chats
              </button>
              <div>
                <h2>{conversation?.patient_name || "Patient"}</h2>
                <p>
                  <span className={`cc-dot${online ? " is-online" : ""}`} aria-hidden="true" />
                  {online ? "Online" : "Offline"}
                </p>
              </div>
            </header>
            <div className="cc-messages" ref={scroller}>
              {loadingThread ? <p className="cc-empty">Loading messages…</p> : null}
              {messages.map((message) => {
                if (message.sender_type === "system") {
                  return (
                    <p key={message.id} className="cc-system">
                      {message.body}
                    </p>
                  );
                }
                const mine = message.sender_type === "staff";
                const imageUrl = resolveMediaUrl(message.image_url);
                return (
                  <div key={message.id} className={`cc-row${mine ? " is-mine" : ""}`}>
                    <div className="cc-bubble">
                      {imageUrl ? (
                        <a
                          className="cc-image-link"
                          href={imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img src={imageUrl} alt={message.body || "Shared image"} className="cc-image" />
                        </a>
                      ) : null}
                      {message.type === "image" && message.body && message.body !== "📷 Image" ? (
                        <p>{message.body}</p>
                      ) : null}
                      {message.type !== "image" ? <p>{message.body}</p> : null}
                      <span className="cc-meta">
                        {formatChatTime(message.created_at)}
                        {mine ? <Ticks read={Boolean(message.read)} /> : null}
                      </span>
                    </div>
                  </div>
                );
              })}
              {peerTyping ? (
                <p className="cc-typing" aria-live="polite">
                  Patient is typing...
                </p>
              ) : null}
            </div>
            {error ? <p className="cc-error">{error}</p> : null}
            {imagePreview ? (
              <div className="cc-preview">
                <img src={imagePreview} alt="Selected preview" />
                <button type="button" onClick={clearImage} aria-label="Remove image">
                  ×
                </button>
              </div>
            ) : null}
            <form className="cc-form" onSubmit={handleSend}>
              <input
                ref={fileInput}
                type="file"
                accept={IMAGE_ACCEPT}
                className="cc-file"
                onChange={handlePickImage}
                disabled={loadingThread || !conversation}
              />
              <button
                type="button"
                className="cc-attach"
                disabled={loadingThread || !conversation}
                onClick={() => fileInput.current?.click()}
                aria-label="Attach image"
              >
                📷
              </button>
              <input
                type="text"
                value={draft}
                maxLength={2000}
                placeholder="Type a message"
                aria-label="Message"
                disabled={loadingThread || !conversation}
                onChange={handleDraftChange}
              />
              <button type="submit" disabled={!canSend}>
                Send
              </button>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}
