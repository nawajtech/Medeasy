export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first)) return first[0];
    return String(first);
  }
  return fallback;
}
