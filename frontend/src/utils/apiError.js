export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;
  if (data?.message && data.message !== "The given data was invalid.") {
    return data.message;
  }
  if (data?.errors) {
    const messages = Object.values(data.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [String(value)]))
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }
  return fallback;
}

export function getApiFieldErrors(error) {
  const data = error?.response?.data;
  if (!data?.errors || typeof data.errors !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(data.errors).map(([field, value]) => [
      field,
      Array.isArray(value) ? value[0] : String(value),
    ])
  );
}
