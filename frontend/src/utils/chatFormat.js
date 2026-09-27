export function formatChatTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatChatListTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return formatChatTime(iso);
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function mergeChatMessages(current, incoming) {
  const map = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) {
    map.set(message.id, message);
  }
  return [...map.values()].sort((a, b) => a.id - b.id);
}

export function applyChatRead(messages, conversation) {
  if (!conversation) return messages;
  const staffCursor = conversation.staff_read_message_id;
  const patientCursor = conversation.patient_read_message_id;
  return messages.map((message) => {
    if (message.sender_type === "patient") {
      return { ...message, read: staffCursor != null && message.id <= staffCursor };
    }
    if (message.sender_type === "staff") {
      return { ...message, read: patientCursor != null && message.id <= patientCursor };
    }
    return { ...message, read: null };
  });
}
