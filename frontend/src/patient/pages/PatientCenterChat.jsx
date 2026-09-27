import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../../utils/apiError";
import { applyChatRead, formatChatTime, mergeChatMessages } from "../../utils/chatFormat";
import { getCenterChat, sendCenterChatMessage, startCenterChat } from "../api/portal";

const POLL_MS = 2000;

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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef(null);
  const afterRef = useRef(0);
  const conversationRef = useRef(null);
  const chatKey = conversationId ? `chat-${conversationId}` : `centre-${centreId}`;
  const [chatKeySeen, setChatKeySeen] = useState(chatKey);

  if (chatKeySeen !== chatKey) {
    setChatKeySeen(chatKey);
    setLoading(true);
    setError("");
    setMessages([]);
    setConversation(null);
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
        if (incoming.length) {
          afterRef.current = incoming.at(-1).id;
        }
        setMessages((current) => {
          const merged = applyChatRead(mergeChatMessages(current, incoming), data.conversation);
          const unchanged = merged.length === current.length
            && merged.every((message, index) => message.id === current[index]?.id && message.read === current[index]?.read);
          return unchanged ? current : merged;
        });
      } catch {
        // Keep the open thread if a poll fails.
      }
    };

    const timer = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [conversation?.id]);

  const lastMessageId = messages.at(-1)?.id;
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lastMessageId, loading]);

  const handleSend = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    const current = conversationRef.current;
    if (!body || !current || sending) return;
    setSending(true);
    setError("");
    try {
      const { data } = await sendCenterChatMessage(current.id, { body });
      setDraft("");
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

  return (
    <div className="pt-cc-page">
      <Link to="/chats" className="pt-back">
        ← Chats
      </Link>
      <section className="pt-cc" aria-label={`Chat with ${title}`}>
        <header className="pt-cc__head">
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
            return (
              <div key={message.id} className={`pt-cc__row${mine ? " is-mine" : ""}`}>
                <div className="pt-cc__bubble">
                  <p>{message.body}</p>
                  <span className="pt-cc__meta">
                    {formatChatTime(message.created_at)}
                    {mine ? <Ticks read={Boolean(message.read)} /> : null}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {error && messages.length > 0 ? <p className="pt-error pt-cc__form-error">{error}</p> : null}

        <form className="pt-cc__form" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            maxLength={2000}
            placeholder="Type a message"
            aria-label="Message"
            disabled={!conversation || loading}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="pt-btn" disabled={!conversation || sending || !draft.trim()}>
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
