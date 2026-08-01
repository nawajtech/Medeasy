/** Shared email / phone format checks used across forms. */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/**
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export function isValidEmail(value) {
  if (value == null) return false;
  const email = String(value).trim();
  if (!email || email.length > 255) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Optional +country code, spaces/dashes/parentheses allowed; 10–15 digits total.
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export function isValidPhone(value) {
  if (value == null) return false;
  const phone = String(value).trim();
  if (!phone || phone.length > 20) return false;
  if (!/^\+?[0-9][0-9\s\-()]*[0-9]$/.test(phone) && !/^\+?[0-9]{10,15}$/.test(phone)) {
    return false;
  }
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * @param {string|null|undefined} value
 * @param {{ required?: boolean, label?: string }} [opts]
 * @returns {string|null} error message or null
 */
export function emailError(value, { required = true, label = "Email" } = {}) {
  const trimmed = value == null ? "" : String(value).trim();
  if (!trimmed) return required ? `${label} is required.` : null;
  if (!isValidEmail(trimmed)) return `Enter a valid ${label.toLowerCase()} address.`;
  return null;
}

/**
 * @param {string|null|undefined} value
 * @param {{ required?: boolean, label?: string }} [opts]
 * @returns {string|null}
 */
export function phoneError(value, { required = true, label = "Phone" } = {}) {
  const trimmed = value == null ? "" : String(value).trim();
  if (!trimmed) return required ? `${label} is required.` : null;
  if (!isValidPhone(trimmed)) {
    return `${label} must be 10–15 digits (optional +country code).`;
  }
  return null;
}
