export const DOSE_PRESETS = [
  { label: "1-0-1", morning: "1", afternoon: "0", night: "1" },
  { label: "1-1-1", morning: "1", afternoon: "1", night: "1" },
  { label: "1-0-0", morning: "1", afternoon: "0", night: "0" },
  { label: "0-0-1", morning: "0", afternoon: "0", night: "1" },
  { label: "SOS", morning: "", afternoon: "", night: "", frequency: "sos" },
];

export const TIMING_OPTIONS = [
  { value: "before_food", label: "Before Food" },
  { value: "after_food", label: "After Food" },
  { value: "with_food", label: "With Food" },
  { value: "empty_stomach", label: "Empty Stomach" },
  { value: "bedtime", label: "Bedtime" },
];

export const FREQUENCY_OPTIONS = [
  { value: "once_daily", label: "Once Daily" },
  { value: "twice_daily", label: "Twice Daily" },
  { value: "three_times_daily", label: "Three Times Daily" },
  { value: "four_times_daily", label: "Four Times Daily" },
  { value: "sos", label: "SOS" },
];

export const DURATION_UNITS = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
];

export const INSTRUCTION_SUGGESTIONS = [
  "Take with plenty of water",
  "Complete the full course",
  "Avoid alcohol while on this medicine",
  "May cause drowsiness — do not drive",
  "Take after meals",
  "Shake well before use",
];

export const BASIC_CARE_SUGGESTIONS = [
  "Drink warm water",
  "Drink plenty of fluids",
  "Take rest",
  "Avoid cold drinks/ice",
  "Avoid oily/spicy food",
  "Eat light meals",
  "Gargle with warm salt water",
  "Steam inhalation (if cold/cough)",
  "Keep hydrated",
];

export function createRxItem(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    medicine_id: null,
    name: "",
    manufacturer_name: "",
    composition: "",
    dose_morning: "1",
    dose_afternoon: "0",
    dose_night: "1",
    duration_value: "5",
    duration_unit: "days",
    timing: "after_food",
    frequency: "twice_daily",
    instruction: "",
    ...overrides,
  };
}

export function emptyPrescriptionForm() {
  return {
    items: [],
    care_suggestions: [],
    advice: "",
    follow_up_days: "",
    follow_up_date: "",
  };
}

export function parsePrescriptionData(appointment) {
  if (appointment?.prescription_data) {
    const data = appointment.prescription_data;
    return {
      items: (data.items || []).map((item) =>
        createRxItem({ ...item, id: item.id || crypto.randomUUID() })
      ),
      care_suggestions: data.care_suggestions || [],
      advice: data.advice || "",
      follow_up_days: data.follow_up_days ? String(data.follow_up_days) : "",
      follow_up_date: data.follow_up_date?.slice(0, 10) || "",
    };
  }
  return emptyPrescriptionForm();
}

function labelFor(value, options) {
  return options.find((o) => o.value === value)?.label || value;
}

function formatDose(item) {
  if (item.frequency === "sos") return "SOS";
  const m = item.dose_morning ?? "0";
  const a = item.dose_afternoon ?? "0";
  const n = item.dose_night ?? "0";
  return `${m}-${a}-${n}`;
}

export function formatPrescriptionText(form) {
  const lines = [];

  form.items.forEach((item, index) => {
    const parts = [
      `${index + 1}. ${item.name}`,
      item.composition ? `(${item.composition})` : "",
    ].filter(Boolean);

    const details = [
      `Dose: ${formatDose(item)}`,
      labelFor(item.frequency, FREQUENCY_OPTIONS),
      labelFor(item.timing, TIMING_OPTIONS),
      item.duration_value
        ? `${item.duration_value} ${labelFor(item.duration_unit, DURATION_UNITS)}`
        : null,
      item.instruction || null,
    ].filter(Boolean);

    lines.push(parts.join(" "));
    lines.push(`   ${details.join(" · ")}`);
    lines.push("");
  });

  if (form.care_suggestions?.length) {
    lines.push("Basic Care:");
    form.care_suggestions.forEach((s) => lines.push(`• ${s}`));
    lines.push("");
  }

  if (form.advice?.trim()) {
    lines.push("Doctor's Advice:");
    lines.push(form.advice.trim());
    lines.push("");
  }

  if (form.follow_up_date) {
    lines.push(`Follow-up: ${form.follow_up_date}`);
  } else if (form.follow_up_days) {
    lines.push(`Follow-up after ${form.follow_up_days} day(s)`);
  }

  return lines.join("\n").trim();
}

export function buildPrescriptionPayload(form) {
  const items = form.items.map(({ id, ...item }) => ({
    ...item,
    id,
    duration_value: item.duration_value ? Number(item.duration_value) : null,
  }));

  return {
    prescription_type: "structured",
    prescription_data: {
      items,
      care_suggestions: form.care_suggestions?.length ? form.care_suggestions : null,
      advice: form.advice?.trim() || null,
      follow_up_days: form.follow_up_days ? Number(form.follow_up_days) : null,
      follow_up_date: form.follow_up_date || null,
    },
    prescription: formatPrescriptionText(form),
  };
}
