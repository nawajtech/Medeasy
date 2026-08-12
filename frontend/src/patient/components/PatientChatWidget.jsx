import { useEffect, useRef, useState } from "react";

const QUICK_REPLIES = [
  { id: "book", label: "Book appointment" },
  { id: "reports", label: "View reports" },
  { id: "rx", label: "Prescriptions" },
  { id: "help", label: "Need help" },
];

function replyFor(input) {
  const text = input.toLowerCase();
  if (text.includes("book") || text.includes("appointment") || text.includes("slot")) {
    return "To book a visit, open Centres, pick your clinic, choose a service and time slot, then confirm. Your booking will appear under Bookings.";
  }
  if (text.includes("report") || text.includes("lab") || text.includes("result")) {
    return "Open Reports from the bottom menu to see lab and diagnostic results shared by your centre. Pull to refresh if a new report was just uploaded.";
  }
  if (text.includes("prescription") || text.includes("rx") || text.includes("medicine")) {
    return "Your e-prescriptions are under Rx / Prescriptions. You can open any prescription to view medicines and dosage details.";
  }
  if (text.includes("cancel") || text.includes("reschedule")) {
    return "Open Bookings, select the appointment, then use Cancel or Reschedule. Centres may limit how close to the visit time you can change it.";
  }
  if (text.includes("profile") || text.includes("password") || text.includes("account")) {
    return "Update your details or password from Profile. Keep your emergency contact and phone number current so centres can reach you.";
  }
  return "I can help with bookings, reports, prescriptions, and your profile. Try a quick option below, or tell me what you need.";
}

export default function PatientChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      text: "Hi! I'm your ApnaMedi assistant. Ask about bookings, reports, or prescriptions.",
    },
  ]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    inputRef.current?.focus();
  }, [open, messages]);

  const send = (raw) => {
    const text = (raw ?? draft).trim();
    if (!text) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user", text };
    const botMsg = {
      id: `b-${Date.now() + 1}`,
      role: "bot",
      text: replyFor(text),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setDraft("");
  };

  const onQuick = (item) => {
    send(item.label);
  };

  return (
    <div className={`pt-chat ${open ? "is-open" : ""}`}>
      {open && (
        <section className="pt-chat__panel" role="dialog" aria-label="Chat assistant" aria-modal="false">
          <header className="pt-chat__head">
            <div>
              <strong>Chat with us</strong>
              <span>ApnaMedi support</span>
            </div>
            <button
              type="button"
              className="pt-chat__icon-btn"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="pt-chat__messages" ref={listRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`pt-chat__bubble ${msg.role === "user" ? "pt-chat__bubble--user" : "pt-chat__bubble--bot"}`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="pt-chat__quick">
            {QUICK_REPLIES.map((item) => (
              <button key={item.id} type="button" onClick={() => onQuick(item)}>
                {item.label}
              </button>
            ))}
          </div>

          <form
            className="pt-chat__composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              aria-label="Message"
              autoComplete="off"
            />
            <button type="submit" className="pt-chat__send" aria-label="Send" disabled={!draft.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M4 12h14M13 6l6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="pt-chat__fab"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path
              d="M5 12.5c0-3.9 3.4-7 7.5-7s7.5 3.1 7.5 7-3.4 7-7.5 7c-.9 0-1.8-.1-2.6-.4L5.5 20l1.2-3.2A6.8 6.8 0 0 1 5 12.5Z"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M9.2 12.5h.01M12.5 12.5h.01M15.8 12.5h.01" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        )}
        {!open && <span className="pt-chat__fab-label">Chat</span>}
      </button>
    </div>
  );
}
