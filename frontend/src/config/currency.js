// Central currency formatting. The active currency comes from the logged-in
// user's organisation (Settings → Billing → Default currency) and defaults to
// INR. Never hardcode a currency symbol in components — use these helpers.

export const CURRENCIES = {
  INR: { symbol: "₹", locale: "en-IN" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "de-DE" },
  GBP: { symbol: "£", locale: "en-GB" },
  AED: { symbol: "AED ", locale: "en-AE" },
  AUD: { symbol: "A$", locale: "en-AU" },
  CAD: { symbol: "C$", locale: "en-CA" },
  SGD: { symbol: "S$", locale: "en-SG" },
};

const DEFAULT_CURRENCY = "INR";
let activeCurrency = DEFAULT_CURRENCY;

// Hydrate synchronously from the persisted user so the very first render is correct.
try {
  const stored = JSON.parse(localStorage.getItem("medeasy_user") || "null");
  if (stored?.currency && CURRENCIES[stored.currency]) {
    activeCurrency = stored.currency;
  }
} catch {
  // ignore malformed storage
}

export function setActiveCurrency(code) {
  activeCurrency = code && CURRENCIES[code] ? code : DEFAULT_CURRENCY;
}

export function getActiveCurrency() {
  return activeCurrency;
}

export function currencySymbol(code = activeCurrency) {
  return (CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY]).symbol;
}

export function formatCurrency(value, { code = activeCurrency, decimals = 0 } = {}) {
  const meta = CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
  const amount = Number(value || 0).toLocaleString(meta.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${meta.symbol}${amount}`;
}
