import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookAppointment, getCentreServices, getCentreSlots, listCentres } from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";


import {
  applyConfirmedCentre,
  extractAppointment,
  mergeAppointment,
  nextAsk,
} from "../utils/extractAppointment";

const WELCOME =
  "Hi! Tell me what you want to book — for example: “CBC at Suraksha tomorrow morning”. I’ll ask if anything is missing.";

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Map chat time → HH:mm */
function toClock(time) {
  if (!time) return null;
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  if (time === "morning") return "09:00";
  if (time === "afternoon") return "14:00";
  if (time === "evening") return "16:00";
  return null;
}

/** Laravel-friendly local datetime: "2026-09-07 09:00:00" */
function formatLocalDateTime(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function parseLocalDateTime(dateStr, clock) {
  if (!dateStr || !clock) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = clock.split(":").map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Parse API/ISO/"YYYY-MM-DD HH:mm:ss" safely (avoids Safari Invalid Date) */
function parseFlexibleDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const dt = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0)
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Resolve a future scheduled_at string for the booking API.
 * Prefers an available centre slot datetime when present.
 */
function resolveScheduledAt(json, slots = []) {
  const clock = toClock(json.time);

  if (clock && slots.length) {
    const match = slots.find((s) => s.time === clock && s.available !== false);
    if (match?.datetime) {
      const fromSlot = parseFlexibleDateTime(match.datetime);
      if (fromSlot && fromSlot.getTime() > Date.now()) {
        return formatLocalDateTime(fromSlot);
      }
    }
    // Vague period (morning) — pick first available slot in that window
    if (json.time === "morning" || json.time === "afternoon" || json.time === "evening") {
      const start = json.time === "morning" ? 9 : json.time === "afternoon" ? 12 : 16;
      const end = json.time === "morning" ? 12 : json.time === "afternoon" ? 16 : 18;
      const inWindow = slots.find((s) => {
        if (s.available === false || !s.time) return false;
        const h = Number(s.time.split(":")[0]);
        const t = parseFlexibleDateTime(s.datetime) || parseLocalDateTime(json.date, s.time);
        return h >= start && h < end && t && t.getTime() > Date.now();
      });
      if (inWindow) {
        const t = parseFlexibleDateTime(inWindow.datetime) || parseLocalDateTime(json.date, inWindow.time);
        if (t) return formatLocalDateTime(t);
      }
    }
  }

  const local = parseLocalDateTime(json.date, clock);
  if (local && local.getTime() > Date.now()) {
    return formatLocalDateTime(local);
  }

  const raw = parseFlexibleDateTime(json.scheduled_at);
  if (raw && raw.getTime() > Date.now()) {
    return formatLocalDateTime(raw);
  }

  return null;
}

function buildBookingPayload(json, slots = []) {
  const scheduledAt = resolveScheduledAt(json, slots);

  const payload = {
    company_id: Number(json.company_id),
    scheduled_at: scheduledAt,
    notes: json.notes || null,
    payment_option: json.payment_option || "pay_on_visit",
    online_method:
      json.payment_option === "online" ? json.online_method || "upi" : null,
  };

  if (json.package_id) {
    payload.package_id = Number(json.package_id);
  } else {
    payload.test_type_ids = (json.test_type_ids || []).map(Number);
  }

  return payload;
}

export default function PatientChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [confirmedCentre, setConfirmedCentre] = useState(null);
  const [centres, setCentres] = useState([]);
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [slots, setSlots] = useState([]);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const appointmentRef = useRef(null);
  const askedTestRef = useRef(false);
  const bookLockRef = useRef(false);
  const slotsRef = useRef([]);
  const slotsReadyRef = useRef(false);
  const pendingBookRef = useRef(null);

  useEffect(() => {
    appointmentRef.current = appointment;
  }, [appointment]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    if (!open) return;
    listCentres()
      .then(({ data }) => setCentres(data?.data ?? []))
      .catch(() => setCentres([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) {
      setMessages([{ id: uid("b"), role: "bot", text: WELCOME }]);
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, slots, booking]);

  useEffect(() => {
    const id = appointment?.json?.company_id;
    if (!id) {
      setTests([]);
      setPackages([]);
      return;
    }
    let active = true;
    getCentreServices(id)
      .then(({ data }) => {
        if (!active) return;
        setTests(data?.tests ?? []);
        setPackages(data?.packages ?? []);
      })
      .catch(() => {
        if (!active) return;
        setTests([]);
        setPackages([]);
      });
    return () => {
      active = false;
    };
  }, [appointment?.json?.company_id]);

  useEffect(() => {
    const id = appointment?.json?.company_id;
    const date = appointment?.json?.date;
    if (!id || !date) {
      setSlots([]);
      slotsReadyRef.current = false;
      return;
    }
    let active = true;
    slotsReadyRef.current = false;
    getCentreSlots(id, { date })
      .then(({ data }) => {
        if (!active) return;
        setSlots((data?.slots ?? []).filter((s) => s.available !== false));
        slotsReadyRef.current = true;
      })
      .catch(() => {
        if (!active) return;
        setSlots([]);
        slotsReadyRef.current = true;
      });
    return () => {
      active = false;
    };
  }, [appointment?.json?.company_id, appointment?.json?.date]);

  const submitBooking = async (result) => {
    if (!result?.ready || bookLockRef.current || booked) return;

    const j = result.json;

    // Wait for slots so we can send a real future datetime
    if (j.company_id && j.date && !slotsReadyRef.current) {
      pendingBookRef.current = result;
      return;
    }

    const payload = buildBookingPayload(j, slotsRef.current);
    if (!payload.scheduled_at) {
      pendingBookRef.current = null;
      bookLockRef.current = false;
      setMessages((prev) => [
        ...prev,
        {
          id: uid("b"),
          role: "bot",
          text: "That time isn’t available anymore. Please pick an available slot below (or say a time like 10:30 am).",
        },
      ]);
      const retry = {
        ...result,
        ready: false,
        missing: [...new Set([...(result.missing || []), "time"])],
        json: { ...j, time: null, scheduled_at: null },
      };
      setAppointment(retry);
      appointmentRef.current = retry;
      return;
    }

    bookLockRef.current = true;
    pendingBookRef.current = null;
    setBooking(true);
    setBusy(true);

    const service = j.package_name || (j.test_names || []).join(", ");

    try {
      const { data } = await bookAppointment(payload);
      setBooked(true);
      setMessages((prev) => [
        ...prev,
        {
          id: uid("b"),
          role: "bot",
          status: "success",
          text: `Appointment booked successfully.\n${service} at ${j.company_name} · ${payload.scheduled_at}`,
        },
      ]);
      const firstId = data.orders?.[0]?.id;
      window.setTimeout(() => {
        navigate(firstId ? `/appointments/${firstId}/confirmation` : "/appointments", {
          state: { booked: data },
        });
        setOpen(false);
      }, 900);
    } catch (err) {
      bookLockRef.current = false;
      setMessages((prev) => [
        ...prev,
        {
          id: uid("b"),
          role: "bot",
          status: "error",
          text: `Booking failed.\n${getApiErrorMessage(err, "Please try again or adjust the details.")}`,
        },
      ]);
    } finally {
      setBooking(false);
      setBusy(false);
    }
  };

  // Resume booking once slots finish loading
  useEffect(() => {
    if (!slotsReadyRef.current) return;
    const pending = pendingBookRef.current;
    if (!pending?.ready || bookLockRef.current || booked) return;
    submitBooking(pending);
  }, [slots, booked]);

  // When centre tests arrive, retry matching test from earlier messages
  useEffect(() => {
    const current = appointmentRef.current;
    if (!current?.json?.company_id) return;
    if (current.json.test_type_ids?.length || current.json.package_id) return;
    if (!tests.length && !packages.length) return;
    if (askedTestRef.current) return;

    const lastNote = (current.json.notes || "").split(" | ").pop();
    if (!lastNote) return;

    const extracted = extractAppointment(lastNote, {
      centres,
      tests,
      packages,
      confirmedCentre: {
        id: current.json.company_id,
        name: current.json.company_name,
      },
    });
    const merged = mergeAppointment(current.json, { ...extracted, did_you_mean: null }, { tests, packages });

    if (merged.json.test_type_ids?.length || merged.json.package_id) {
      askedTestRef.current = true;
      setAppointment(merged);
      appointmentRef.current = merged;
      if (merged.ready) {
        submitBooking(merged);
      } else {
        const ask = nextAsk(merged);
        setMessages((prev) => [...prev, { id: uid("b"), role: "bot", text: ask.text, ask: ask.kind }]);
      }
    }
  }, [tests, packages, centres]);

  const pushBotAsk = (merged) => {
    const ask = nextAsk(merged);
    setMessages((prev) => [
      ...prev,
      {
        id: uid("b"),
        role: "bot",
        text: ask.text,
        ask: ask.kind,
        did_you_mean: merged.did_you_mean,
      },
    ]);
  };

  const finishExtract = (merged) => {
    setAppointment(merged);
    appointmentRef.current = merged;
    if (merged.ready) {
      submitBooking(merged);
    } else {
      pushBotAsk(merged);
    }
  };

  const processText = (raw) => {
    const text = (raw || "").trim();
    if (!text || busy || booking || booked) return;

    setMessages((prev) => [...prev, { id: uid("u"), role: "user", text }]);
    setDraft("");
    setBusy(true);

    window.setTimeout(() => {
      const extracted = extractAppointment(text, {
        centres,
        tests,
        packages,
        confirmedCentre,
      });
      const merged = mergeAppointment(appointmentRef.current?.json, extracted, { tests, packages });
      if (merged.json.company_id !== appointmentRef.current?.json?.company_id) {
        askedTestRef.current = false;
      }
      setBusy(false);
      finishExtract(merged);
    }, 320);
  };

  const confirmCentre = (centre) => {
    if (busy || booking || booked) return;
    const picked = { id: centre.id, name: centre.name };
    setConfirmedCentre(picked);
    askedTestRef.current = false;
    const fixed = applyConfirmedCentre(appointmentRef.current, picked);
    setMessages((prev) => [
      ...prev,
      { id: uid("u"), role: "user", text: `Yes — ${picked.name}` },
    ]);
    finishExtract(fixed);
  };

  const pickSlot = (slot) => {
    if (busy || booking || booked) return;
    const current = appointmentRef.current?.json || {};
    const withTime = {
      ...current,
      time: slot.time,
      scheduled_at: slot.datetime || current.scheduled_at,
      notes: null,
    };
    const merged = mergeAppointment(current, { json: withTime, did_you_mean: null }, { tests, packages });
    // Prefer exact slot datetime from API
    if (slot.datetime) {
      merged.json.scheduled_at = slot.datetime;
      merged.json.time = slot.time;
    }
    setMessages((prev) => [...prev, { id: uid("u"), role: "user", text: slot.time }]);
    finishExtract(merged);
  };

  const resetChat = () => {
    setMessages([{ id: uid("b"), role: "bot", text: WELCOME }]);
    setAppointment(null);
    appointmentRef.current = null;
    setConfirmedCentre(null);
    setDraft("");
    setSlots([]);
    setTests([]);
    setPackages([]);
    askedTestRef.current = false;
    bookLockRef.current = false;
    pendingBookRef.current = null;
    slotsReadyRef.current = false;
    setBooking(false);
    setBooked(false);
  };

  const showSlotPicks =
    appointment?.missing?.includes("time") &&
    appointment?.json?.company_id &&
    appointment?.json?.date &&
    slots.length > 0 &&
    !busy &&
    !booking &&
    !booked;

  const lastDidYouMean =
    [...messages].reverse().find((m) => m.did_you_mean)?.did_you_mean || null;
  const waitingCentreConfirm = Boolean(lastDidYouMean && !appointment?.json?.company_id);

  return (
    <div className={`pt-chat ${open ? "is-open" : ""}`}>
      {!open && (
        <button type="button" className="pt-chat__fab" onClick={() => setOpen(true)}>
          Book with chat
        </button>
      )}

      {open && (
        <div className="pt-chat__panel">
          <header className="pt-chat__head">
            <div>
              <strong>ApnaMedi Chat</strong>
              <span>I’ll ask for anything that’s missing</span>
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
              <div key={msg.id} className={`pt-chat__row pt-chat__row--${msg.role}`}>
                <div
                  className={[
                    `pt-chat__bubble pt-chat__bubble--${msg.role}`,
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

            {(busy || booking) && (
              <div className="pt-chat__row pt-chat__row--bot">
                <div className="pt-chat__bubble pt-chat__bubble--bot pt-chat__typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {waitingCentreConfirm && (
              <div className="pt-chat__choices">
                {lastDidYouMean.suggestions.map((s) => (
                  <button key={s.id} type="button" onClick={() => confirmCentre(s)}>
                    Yes — {s.name}
                  </button>
                ))}
              </div>
            )}

            {showSlotPicks && (
              <div className="pt-chat__choices">
                <p className="pt-chat__choices-label">Available slots — tap one:</p>
                <div className="pt-chat__slots">
                  {slots.slice(0, 12).map((s) => (
                    <button key={s.time} type="button" onClick={() => pickSlot(s)}>
                      {s.time}
                    </button>
                  ))}
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
                  : waitingCentreConfirm
                    ? "Or type the centre name…"
                    : appointment?.missing?.[0] === "date"
                      ? "Please mention a date…"
                      : appointment?.missing?.[0] === "time"
                        ? "Please give a time slot…"
                        : appointment?.missing?.[0] === "centre"
                          ? "Please mention a centre…"
                          : appointment?.missing?.[0] === "test"
                            ? "Please mention a test…"
                            : "Type your message…"
              }
              disabled={busy || booking || booked}
              autoComplete="off"
            />
            <button type="submit" disabled={busy || booking || booked || !draft.trim()} aria-label="Send">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
