import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatChatListTime } from "../../utils/chatFormat";
import { deleteCenterChat, listCenterChats } from "../api/portal";

export default function PatientChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data } = await listCenterChats();
        if (active) {
          setChats(data?.data ?? []);
          setError("");
        }
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load chats."));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleDelete = async (event, chat) => {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(`Delete chat with ${chat.centre_name}?`)) return;

    setDeletingId(chat.id);
    setError("");
    try {
      await deleteCenterChat(chat.id);
      setChats((prev) => prev.filter((row) => row.id !== chat.id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete chat."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="pt-page-head">
        <h1 className="pt-page-title">Chats</h1>
        <p className="pt-page-sub">Messages with diagnostic centres.</p>
      </div>

      {error ? <p className="pt-error">{error}</p> : null}
      {loading ? (
        <div className="pt-empty">Loading chats…</div>
      ) : chats.length === 0 ? (
        <div className="pt-empty">
          No chats yet. Open a diagnostic centre and choose Chat with Center.
        </div>
      ) : (
        <div className="pt-cc-list">
          {chats.map((chat) => (
            <div key={chat.id} className="pt-cc-list__row">
              <Link to={`/chats/${chat.id}`} className="pt-cc-list__item">
                <span className={`pt-cc-dot${chat.staff_online ? " is-online" : ""}`} aria-hidden="true" />
                <span className="pt-cc-list__body">
                  <strong>{chat.centre_name}</strong>
                  <span>{chat.last_message_preview || "No messages yet"}</span>
                </span>
                <span className="pt-cc-list__side">
                  <time>{formatChatListTime(chat.last_message_at)}</time>
                  {chat.unread_count > 0 ? (
                    <span className="pt-cc-badge">{chat.unread_count > 9 ? "9+" : chat.unread_count}</span>
                  ) : null}
                </span>
              </Link>
              <button
                type="button"
                className="pt-cc-delete"
                disabled={deletingId === chat.id}
                onClick={(event) => handleDelete(event, chat)}
              >
                {deletingId === chat.id ? "…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
