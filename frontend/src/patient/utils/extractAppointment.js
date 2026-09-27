/**
 * SIMPLE appointment extractor
 *
 * Input:  "CBC at Suraksha tomorrow morning"
 * Output: { centre, date, time, test, ... }
 *
 * Steps:
 *  1. Look for date words  → tomorrow / today
 *  2. Look for time words  → morning / afternoon / 10:30 am
 *  3. Look for centre name → match against centres list
 *  4. Look for test name   → match against tests list
 *  5. Build JSON
 */

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Only today or future dates are allowed for booking */
function allowIfNotPast(dateObj, today = startOfDay()) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return { date: null, error: "Invalid date" };
  const day = startOfDay(dateObj);
  if (day < today) {
    return { date: null, error: "Past dates are not allowed" };
  }
  return { date: toDate(day), error: null };
}

const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function nextWeekday(targetDow, from = startOfDay()) {
  const current = from.getDay();
  let delta = (targetDow - current + 7) % 7;
  if (delta === 0) delta = 7; // "Monday" means next Monday if today is Monday
  return addDays(from, delta);
}

/**
 * Step 1 — find date in text
 * Supports: today, tomorrow, next week, weekdays, and specific dates
 * Past dates (yesterday / older) are blocked
 */
function findDate(text) {
  const t = text.toLowerCase();
  const today = startOfDay();

  // Past words → blocked
  if (/\byesterday\b/.test(t) || /\blast\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t)) {
    return { date: null, error: "Past dates are not allowed" };
  }

  if (/\btoday\b/.test(t)) return allowIfNotPast(today, today);
  if (/\btomorrow\b/.test(t)) return allowIfNotPast(addDays(today, 1), today);
  if (/\bday after tomorrow\b/.test(t)) return allowIfNotPast(addDays(today, 2), today);
  if (/\bnext week\b/.test(t)) return allowIfNotPast(addDays(today, 7), today);
  if (/\bnext month\b/.test(t)) return allowIfNotPast(addMonths(today, 1), today);

  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b(next\\s+)?${name}\\b`).test(t)) {
      return allowIfNotPast(nextWeekday(dow, today), today);
    }
  }

  // 2026-09-10 (ISO)
  const iso = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return allowIfNotPast(d, today);
  }

  // 10/09/2026 or 10-09-2026 or 10.09.2026 (DD/MM/YYYY — India style)
  const dmy = t.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2}|\d{2})\b/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const d = new Date(year, month, day);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return allowIfNotPast(d, today);
    }
  }

  // 10/09 or 10-09 (DD/MM, current or next year)
  const dm = t.match(/\b(\d{1,2})[\/.\-](\d{1,2})\b/);
  if (dm) {
    const day = Number(dm[1]);
    const month = Number(dm[2]) - 1;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      let d = new Date(today.getFullYear(), month, day);
      if (d.getMonth() === month && d.getDate() === day) {
        if (d < today) d = new Date(today.getFullYear() + 1, month, day);
        return allowIfNotPast(d, today);
      }
    }
  }

  // 10 September 2026 / 10th Sep / September 10
  const named = t.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/
  );
  if (named) {
    const day = Number(named[1]);
    const month = MONTHS[named[2]];
    const year = named[3] ? Number(named[3]) : today.getFullYear();
    let d = new Date(year, month, day);
    if (d.getMonth() === month && d.getDate() === day) {
      if (!named[3] && d < today) d = new Date(year + 1, month, day);
      return allowIfNotPast(d, today);
    }
  }

  const namedFlip = t.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/
  );
  if (namedFlip) {
    const month = MONTHS[namedFlip[1]];
    const day = Number(namedFlip[2]);
    const year = namedFlip[3] ? Number(namedFlip[3]) : today.getFullYear();
    let d = new Date(year, month, day);
    if (d.getMonth() === month && d.getDate() === day) {
      if (!namedFlip[3] && d < today) d = new Date(year + 1, month, day);
      return allowIfNotPast(d, today);
    }
  }

  return { date: null, error: null };
}

/** Step 2 — find time in text */
function findTime(text) {
  const t = text.toLowerCase();

  const clock = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (clock) {
    let h = Number(clock[1]);
    const m = clock[2] || "00";
    if (clock[3] === "pm" && h < 12) h += 12;
    if (clock[3] === "am" && h === 12) h = 0;
    return `${pad(h)}:${m}`;
  }

  // Slot picks like "09:30" / "14:00" (24h, no am/pm)
  const clock24 = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (clock24) {
    return `${pad(Number(clock24[1]))}:${clock24[2]}`;
  }


  if (t.includes("morning")) return "morning";
  if (t.includes("afternoon")) return "afternoon";
  if (t.includes("evening")) return "evening";
  return null;
}

/** How similar are two short strings? 0 = different, 1 = same */
function similarity(a, b) {
  const s = (a || "").toLowerCase();
  const t = (b || "").toLowerCase();
  if (!s || !t) return 0;
  if (s === t) return 1;
  if (s.includes(t) || t.includes(s)) return 0.9;

  // simple edit distance
  const rows = s.length + 1;
  const cols = t.length + 1;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dist[i][0] = i;
  for (let j = 0; j < cols; j++) dist[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost
      );
    }
  }
  const maxLen = Math.max(s.length, t.length);
  return 1 - dist[s.length][t.length] / maxLen;
}

/** Pull possible centre words from the sentence (skip common booking words) */
function centreHints(text) {
  const skip = new Set([
    "i", "me", "my", "a", "an", "the", "to", "for", "at", "on", "in", "with",
    "need", "want", "please", "book", "booking", "appointment", "visit",
    "tomorrow", "today", "yesterday", "morning", "afternoon", "evening",
    "test", "tests", "package", "pay", "online", "cash", "upi", "card",
    "next", "week", "month", "am", "pm", "and", "or", "of", "is",
    "centre", "center", "clinic", "lab", "diagnostic",
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !skip.has(w) && !/^\d+$/.test(w));
}

/**
 * Step 3 — find centre
 * Exact match first. If typo (e.g. "sursha"), return similar centres to ask:
 * "Did you mean Suraksha?"
 */
function findCentre(text, centres = [], confirmedCentre = null) {
  if (confirmedCentre?.id) {
    return { centre: confirmedCentre, suggestions: [], typed: null };
  }

  const t = text.toLowerCase();

  // 1) Exact / contains match
  for (const c of centres) {
    const name = (c.name || "").toLowerCase();
    if (!name) continue;
    const first = name.split(/\s+/)[0];
    if (t.includes(name) || (first.length > 3 && t.includes(first))) {
      return { centre: { id: c.id, name: c.name }, suggestions: [], typed: null };
    }
  }

  // 2) Fuzzy: score each centre against hint words like "sursha"
  const hints = centreHints(text);
  if (!hints.length || !centres.length) {
    return { centre: null, suggestions: [], typed: null };
  }

  const scored = [];
  for (const c of centres) {
    const name = (c.name || "").toLowerCase();
    if (!name) continue;
    const first = name.split(/\s+/)[0];
    let best = 0;
    let typed = null;
    for (const hint of hints) {
      const score = Math.max(similarity(hint, name), similarity(hint, first));
      if (score > best) {
        best = score;
        typed = hint;
      }
    }
    if (best >= 0.55) {
      scored.push({ id: c.id, name: c.name, score: best, typed });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  // Close enough to auto-pick? Still ask — user typed a typo
  if (top.length && top[0].score >= 0.55) {
    return {
      centre: null,
      suggestions: top.map(({ id, name, score }) => ({ id, name, score })),
      typed: top[0].typed,
    };
  }

  return { centre: null, suggestions: [], typed: null };
}

/** Step 4 — find test / package in text */
function findTest(text, tests = [], packages = []) {
  const t = text.toLowerCase();

  for (const p of packages) {
    const name = (p.package_name || p.name || "").toLowerCase();
    if (name && t.includes(name)) {
      return { package_id: p.id, package_name: p.package_name || p.name, test_type_ids: [], test_names: [] };
    }
  }

  for (const test of tests) {
    const name = (test.name || "").toLowerCase();
    const code = (test.code || "").toLowerCase();
    if ((name && t.includes(name)) || (code && t.includes(code))) {
      return {
        package_id: null,
        package_name: null,
        test_type_ids: [test.id],
        test_names: [test.name],
      };
    }
  }

  return null;
}

/** Step 5 — payment */
function findPayment(text) {
  const t = text.toLowerCase();
  if (t.includes("upi")) return { payment_option: "online", online_method: "upi" };
  if (t.includes("card")) return { payment_option: "online", online_method: "card" };
  if (t.includes("online")) return { payment_option: "online", online_method: "upi" };
  if (t.includes("pay on visit") || t.includes("cash")) {
    return { payment_option: "pay_on_visit", online_method: null };
  }
  return { payment_option: "pay_on_visit", online_method: null };
}

/**
 * Main function — call this with user text + lists from API
 * Pass confirmedCentre when user taps "Yes, Suraksha"
 */
export function extractAppointment(
  text,
  { centres = [], tests = [], packages = [], confirmedCentre = null } = {}
) {
  const message = (text || "").trim();
  const steps = [];

  // 1) date
  const dateResult = findDate(message);
  const date = dateResult.date;
  steps.push({
    step: 1,
    label: "Date",
    found: Boolean(date),
    value: date || (dateResult.error ? dateResult.error : "not found"),
    how: 'Supports today/tomorrow, weekdays, and dates like 10/09/2026 or 10 September — past dates blocked',
  });

  // 2) time
  const time = findTime(message);
  steps.push({
    step: 2,
    label: "Time",
    found: Boolean(time),
    value: time || "not found",
    how: 'Looks for "morning", "afternoon", or "10:30 am"',
  });

  // 3) centre (exact or "did you mean?")
  const centreResult = findCentre(message, centres, confirmedCentre);
  const centre = centreResult.centre;
  const suggestions = centreResult.suggestions || [];
  steps.push({
    step: 3,
    label: "Centre",
    found: Boolean(centre),
    value: centre
      ? centre.name
      : suggestions.length
        ? `Did you mean ${suggestions.map((s) => s.name).join(" / ")}?`
        : "not found",
    how: suggestions.length
      ? `You typed "${centreResult.typed}" — pick the centre that matches`
      : "Matches centre name from your centres list",
  });

  // 4) test
  const service = findTest(message, tests, packages);
  steps.push({
    step: 4,
    label: "Test / Package",
    found: Boolean(service),
    value: service
      ? service.package_name || service.test_names.join(", ")
      : "not found",
    how: "Matches test/package name after centre is known",
  });

  // 5) payment
  const payment = findPayment(message);
  steps.push({
    step: 5,
    label: "Payment",
    found: true,
    value: payment.online_method
      ? `${payment.payment_option} (${payment.online_method})`
      : payment.payment_option,
    how: 'Defaults to pay_on_visit; looks for "upi" / "card" / "online"',
  });

  const scheduled_at =
    date && time && /^\d{2}:\d{2}$/.test(time)
      ? `${date} ${time}:00`
      : date && time === "morning"
        ? `${date} 09:00:00`
        : date && time === "afternoon"
          ? `${date} 14:00:00`
          : date && time === "evening"
            ? `${date} 16:00:00`
            : null;

  const json = {
    company_id: centre?.id ?? null,
    company_name: centre?.name ?? null,
    date,
    time,
    scheduled_at,
    test_type_ids: service?.test_type_ids ?? [],
    test_names: service?.test_names ?? [],
    package_id: service?.package_id ?? null,
    package_name: service?.package_name ?? null,
    payment_option: payment.payment_option,
    online_method: payment.online_method,
    notes: message || null,
  };

  const missing = [];
  if (!json.company_id) missing.push("centre");
  if (!json.date) missing.push("date");
  if (!json.time) missing.push("time");
  if (!json.test_type_ids.length && !json.package_id) missing.push("test");

  return {
    steps,
    json,
    missing,
    ready: missing.length === 0,
    did_you_mean: suggestions.length
      ? {
          typed: centreResult.typed,
          question: `Did you mean ${suggestions[0].name}?`,
          suggestions,
        }
      : null,
  };
}

/** Keep earlier answers; only fill in what this message found */
export function mergeAppointment(previousJson, extracted, catalogue = {}) {
  const prev = previousJson || {};
  const next = extracted?.json || {};
  const { tests = [], packages = [] } = catalogue;

  const merged = {
    company_id: next.company_id ?? prev.company_id ?? null,
    company_name: next.company_name ?? prev.company_name ?? null,
    date: next.date ?? prev.date ?? null,
    time: next.time ?? prev.time ?? null,
    scheduled_at: null,
    test_type_ids: next.test_type_ids?.length ? next.test_type_ids : prev.test_type_ids || [],
    test_names: next.test_names?.length ? next.test_names : prev.test_names || [],
    package_id: next.package_id ?? prev.package_id ?? null,
    package_name: next.package_name ?? prev.package_name ?? null,
    payment_option: next.payment_option || prev.payment_option || "pay_on_visit",
    online_method: next.online_method ?? prev.online_method ?? null,
    notes: (() => {
      if (!next.notes) return prev.notes || null;
      if (!prev.notes) return next.notes;
      if (prev.notes.includes(next.notes)) return prev.notes;
      return `${prev.notes} | ${next.notes}`;
    })(),
  };

  // If test still missing, search whole conversation notes
  if (!merged.package_id && !(merged.test_type_ids || []).length && merged.notes && (tests.length || packages.length)) {
    const service = findTest(merged.notes, tests, packages);
    if (service) {
      merged.package_id = service.package_id;
      merged.package_name = service.package_name;
      merged.test_type_ids = service.test_type_ids;
      merged.test_names = service.test_names;
    }
  }

  if (merged.date && merged.time) {
    if (/^\d{2}:\d{2}$/.test(merged.time)) merged.scheduled_at = `${merged.date} ${merged.time}:00`;
    else if (merged.time === "morning") merged.scheduled_at = `${merged.date} 09:00:00`;
    else if (merged.time === "afternoon") merged.scheduled_at = `${merged.date} 14:00:00`;
    else if (merged.time === "evening") merged.scheduled_at = `${merged.date} 16:00:00`;
  }

  const did_you_mean = extracted?.did_you_mean || null;
  const missing = [];
  if (!merged.company_id && !did_you_mean) missing.push("centre");
  if (!merged.date) missing.push("date");
  if (!merged.time) missing.push("time");
  if (!merged.test_type_ids.length && !merged.package_id) missing.push("test");

  return {
    ...extracted,
    json: merged,
    missing,
    ready: missing.length === 0 && !did_you_mean,
    did_you_mean,
  };
}

/** Apply a confirmed centre (from "Did you mean?") onto the draft */
export function applyConfirmedCentre(previousResult, centre) {
  const json = {
    ...(previousResult?.json || {}),
    company_id: centre.id,
    company_name: centre.name,
  };
  return mergeAppointment(json, { json: { ...json, notes: null }, did_you_mean: null });
}

/** Friendly bot question for whatever is still missing */
export function nextAsk(result) {
  if (result?.did_you_mean) {
    return {
      text: `I found a similar centre for “${result.did_you_mean.typed}”. ${result.did_you_mean.question}`,
      kind: "did_you_mean",
    };
  }

  const missing = result?.missing || [];
  const j = result?.json || {};
  const known = [];
  if (j.company_name) known.push(`Centre: ${j.company_name}`);
  if (j.date) known.push(`Date: ${j.date}`);
  if (j.time) known.push(`Time: ${j.time}`);
  if (j.package_name || j.test_names?.length) {
    known.push(`Test: ${j.package_name || j.test_names.join(", ")}`);
  }
  const prefix = known.length ? `Got it — ${known.join(" · ")}.\n\n` : "";

  if (missing.includes("centre")) {
    return {
      text: `${prefix}Please mention a diagnostic centre (e.g. Suraksha).`,
      kind: "centre",
    };
  }
  if (missing.includes("date")) {
    return {
      text: `${prefix}Please mention a date (e.g. tomorrow, Monday, or 10/09/2026).`,
      kind: "date",
    };
  }
  if (missing.includes("time")) {
    return {
      text: `${prefix}Please give a time slot (e.g. morning, afternoon, or 10:30 am).`,
      kind: "time",
    };
  }
  if (missing.includes("test")) {
    return {
      text: `${prefix}Please mention which test or package you need (e.g. CBC, Full body checkup).`,
      kind: "test",
    };
  }

  return {
    text: `${prefix}Everything looks ready for booking.\n• Centre: ${j.company_name}\n• When: ${j.scheduled_at || `${j.date} ${j.time}`}\n• Service: ${
      j.package_name || (j.test_names || []).join(", ")
    }\n• Pay: ${j.payment_option}`,
    kind: "ready",
  };
}
