import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { patientChat } from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";

const WELCOME =
  "Hi! I’m Apna Medi’s booking assistant. Tell me what you need — for example: “USG tomorrow between 10 AM and 12 PM”.";

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function PatientChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) {
      setMessages([{ id: uid("b"), role: "assistant", text: WELCOME }]);
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const historyPayload = (list) =>
    list
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.id !== "welcome" && m.text)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));

  const processText = async (raw) => {
    const text = (raw || "").trim();
    if (!text || busy || booked) return;

    const userMsg = { id: uid("u"), role: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);

    try {
      // Send prior turns only; the new user message is `message`
      const history = historyPayload(messages);
      const { data } = await patientChat({ message: text, history });
      const reply = data?.reply || "Sorry, I couldn’t process that. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          id: uid("b"),
          role: "assistant",
          text: reply,
          status: data?.booked ? "success" : undefined,
        },
      ]);

      if (data?.booked) {
        setBooked(true);
        const appointmentId = data.appointment_id;
      window.setTimeout(() => {
          navigate(appointmentId ? `/appointments/${appointmentId}/confirmation` : "/appointments", {
            state: { booked: true, appointment_id: appointmentId },
        });
        setOpen(false);
        }, 1200);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid("b"),
          role: "assistant",
          status: "error",
          text: getApiErrorMessage(
            err,
            err?.response?.data?.reply || "Something went wrong. Please try again."
          ),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const resetChat = () => {
    setMessages([{ id: uid("b"), role: "assistant", text: WELCOME }]);
    setDraft("");
    setBusy(false);
    setBooked(false);
  };

  return (
    <div className={`pt-chat ${open ? "is-open" : ""}`}>
      {!open && (
        <button type="button" className="pt-chat__fab" onClick={() => setOpen(true)}>
          Easy Booking
        </button>
      )}

      {open && (
        <div className="pt-chat__panel">
          <header className="pt-chat__head">
            <div>
              <strong>Easy Booking</strong>
              <span>AI assistant — I’ll check real availability</span>
            </div>
            <div className="pt-chat__head-actions">
              <button type="button" className="pt-chat__text-btn" onClick={resetChat}>
                New
              </button>
              <button type="button" className="pt-chat__icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
          </header>

          <div className="pt-chat__messages" ref={listRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`pt-chat__row pt-chat__row--${msg.role === "user" ? "user" : "bot"}`}
              >
                <div
                  className={[
                    `pt-chat__bubble pt-chat__bubble--${msg.role === "user" ? "user" : "bot"}`,
                    msg.status === "success" ? "pt-chat__bubble--success" : "",
                    msg.status === "error" ? "pt-chat__bubble--error" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="pt-chat__row pt-chat__row--bot">
                <div className="pt-chat__bubble pt-chat__bubble--bot pt-chat__typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form
            className="pt-chat__composer"
            onSubmit={(e) => {
              e.preventDefault();
              processText(draft);
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                booked
                  ? "Booking complete — tap New to start over"
                            : "Type your message…"
              }
              disabled={busy || booked}
              autoComplete="off"
            />
            <button type="submit" disabled={busy || booked || !draft.trim()} aria-label="Send">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
