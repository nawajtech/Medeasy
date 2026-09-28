import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../../utils/apiError";
import { applyChatRead, formatChatTime, mergeChatMessages } from "../../utils/chatFormat";
import { connectCenterChatSocket } from "../../utils/centerChatSocket";
import { fileToDataUrl } from "../../utils/fileToDataUrl";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { PATIENT_TOKEN_KEY } from "../api/axios";
import { getCenterChat, sendCenterChatMessage, startCenterChat } from "../api/portal";

const FALLBACK_POLL_MS = 12000;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function Ticks({ read }) {
  return (
    <span className={`pt-cc-tick${read ? " is-read" : ""}`} aria-label={read ? "Read" : "Sent"}>
      {read ? "✓✓" : "✓"}
    </span>
  );
}

export default function PatientCenterChat() {
  const { centreId, conversationId } = useParams();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [socketLive, setSocketLive] = useState(false);
  const scroller = useRef(null);
  const fileInput = useRef(null);
  const afterRef = useRef(0);
  const conversationRef = useRef(null);
  const socketRef = useRef(null);
  const typingHideRef = useRef(null);
  const chatKey = conversationId ? `chat-${conversationId}` : `centre-${centreId}`;
  const [chatKeySeen, setChatKeySeen] = useState(chatKey);

  if (chatKeySeen !== chatKey) {
    setChatKeySeen(chatKey);
    setLoading(true);
    setError("");
    setMessages([]);
    setConversation(null);
    setPeerTyping(false);
    setImageFile(null);
    setImagePreview("");
  }

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    let active = true;
    afterRef.current = 0;

    (async () => {
      try {
        const { data } = conversationId
          ? await getCenterChat(conversationId, { mark_read: 1 })
          : await startCenterChat({ company_id: Number(centreId) });
        if (!active) return;
        const nextMessages = data.messages ?? [];
        setConversation(data.conversation);
        setMessages(nextMessages);
        afterRef.current = nextMessages.at(-1)?.id ?? 0;
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not open this chat."));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [centreId, conversationId, chatKey]);

  useEffect(() => {
    if (!conversation?.id) return undefined;

    const token = localStorage.getItem(PATIENT_TOKEN_KEY);
    const socket = connectCenterChatSocket({
      token,
      conversationId: conversation.id,
      onConnectionChange: setSocketLive,
      onMessage: (payload) => {
        const incoming = payload?.message;
        const nextConversation = payload?.conversation;
        if (nextConversation) setConversation(nextConversation);
        if (!incoming?.id) return;
        afterRef.current = Math.max(afterRef.current, incoming.id);
        setMessages((current) =>
          applyChatRead(mergeChatMessages(current, [incoming]), nextConversation || conversationRef.current)
        );
        setPeerTyping(false);
      },
      onTyping: (payload) => {
        if (payload?.actor_type === "staff") {
          setPeerTyping(true);
          if (typingHideRef.current) clearTimeout(typingHideRef.current);
          typingHideRef.current = setTimeout(() => setPeerTyping(false), 2500);
        }
      },
      onTypingStop: (payload) => {
        if (payload?.actor_type === "staff") setPeerTyping(false);
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
        const { data } = await getCenterChat(conversation.id, {
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
  }, [lastMessageId, loading, peerTyping, imagePreview]);

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
    const current = conversationRef.current;
    if ((!body && !imageFile) || !current || sending) return;
    setSending(true);
    setError("");
    socketRef.current?.emitTypingStop();
    try {
      const payload = {};
      if (body) payload.body = body;
      if (imageFile) payload.image_base64 = await fileToDataUrl(imageFile);
      const { data } = await sendCenterChatMessage(current.id, payload);
      setDraft("");
      clearImage();
      setConversation(data.conversation);
      setMessages((prev) => applyChatRead(mergeChatMessages(prev, [data.message]), data.conversation));
      afterRef.current = Math.max(afterRef.current, data.message?.id ?? 0);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send the message."));
    } finally {
      setSending(false);
    }
  };

  const title = conversation?.centre_name || "Diagnostic centre";
  const online = Boolean(conversation?.staff_online);
  const canSend = Boolean(conversation) && !sending && !loading && (draft.trim() || imageFile);

  return (
    <div className="pt-cc-page">
      <section className="pt-cc" aria-label={`Chat with ${title}`}>
        <header className="pt-cc__head">
          <Link to="/chats" className="pt-cc__back">
            ← Chats
          </Link>
          <div>
            <h1>{title}</h1>
            <p className={online ? "is-online" : undefined}>
              <span className={`pt-cc-dot${online ? " is-online" : ""}`} aria-hidden="true" />
              {online ? "Online" : "Offline"}
            </p>
          </div>
        </header>

        <div className="pt-cc__messages" ref={scroller}>
          {loading ? <p className="pt-cc__hint">Loading chat…</p> : null}
          {!loading && error && messages.length === 0 ? <p className="pt-error">{error}</p> : null}
          {messages.map((message) => {
            if (message.sender_type === "system") {
              return (
                <p key={message.id} className="pt-cc__system">
                  {message.body}
                </p>
              );
            }
            const mine = message.sender_type === "patient";
            const imageUrl = resolveMediaUrl(message.image_url);
            const caption =
              message.body && message.body !== "📷 Image" ? message.body : "";
            return (
              <div key={message.id} className={`pt-cc__row${mine ? " is-mine" : ""}`}>
                <div className="pt-cc__bubble">
                  {imageUrl ? (
                    <a
                      className="pt-cc__image-link"
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src={imageUrl} alt={caption || "Shared image"} className="pt-cc__image" />
                    </a>
                  ) : null}
                  {caption || !imageUrl ? <p>{caption || message.body}</p> : null}
                  <span className="pt-cc__meta">
                    {formatChatTime(message.created_at)}
                    {mine ? <Ticks read={Boolean(message.read)} /> : null}
                  </span>
                </div>
              </div>
            );
          })}
          {peerTyping ? (
            <p className="pt-cc__typing" aria-live="polite">
              Diagnostic Center is typing...
            </p>
          ) : null}
        </div>

        {error && messages.length > 0 ? <p className="pt-error pt-cc__form-error">{error}</p> : null}

        {imagePreview ? (
          <div className="pt-cc__preview">
            <img src={imagePreview} alt="Selected preview" />
            <button type="button" onClick={clearImage} aria-label="Remove image">
              ×
            </button>
          </div>
        ) : null}

        <form className="pt-cc__form" onSubmit={handleSend}>
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="pt-cc__file"
            onChange={handlePickImage}
            disabled={!conversation || loading}
          />
          <button
            type="button"
            className="pt-cc__attach"
            disabled={!conversation || loading}
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
            disabled={!conversation || loading}
            onChange={handleDraftChange}
          />
          <button type="submit" className="pt-btn" disabled={!canSend}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
