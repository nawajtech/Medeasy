import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { changePassword, updateProfile } from "../api/auth";
import Modal from "./crud/Modal";
import { getApiErrorMessage } from "../utils/apiError";
import { IconChevronDown, IconLock, IconLogOut, IconUser } from "./icons";
import "./ProfileMenu.css";
import "./crud/crud.css";

function ProfileMenu() {
  const { user, logout, updateUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const menuRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const openProfile = () => {
    setMenuOpen(false);
    setError("");
    setSuccess("");
    setProfileForm({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    });
    setProfileOpen(true);
  };

  const openPassword = () => {
    setMenuOpen(false);
    setError("");
    setSuccess("");
    setPasswordForm({
      current_password: "",
      password: "",
      password_confirmation: "",
    });
    setPasswordOpen(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await updateProfile(profileForm);
      updateUser(data.user);
      setSuccess(data.message || "Profile updated.");
      setTimeout(() => setProfileOpen(false), 800);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update profile."));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await changePassword(passwordForm);
      setSuccess(data.message || "Password changed.");
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      setTimeout(() => setPasswordOpen(false), 800);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to change password."));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  return (
    <>
      <div className="profile-menu-wrap" ref={menuRef}>
        <button
          type="button"
          className={`profile${menuOpen ? " is-open" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="profile-avatar">{initial}</span>
          <span className="profile-meta">
            <span className="profile-name">{user?.name}</span>
            <span className="profile-role">{user?.role?.replace(/_/g, " ")}</span>
          </span>
          <span className="profile-chevron" aria-hidden="true">
            <IconChevronDown size={16} />
          </span>
        </button>

        {menuOpen ? (
          <div className="profile-dropdown" role="menu">
            <div className="profile-dropdown-header">
              <span className="profile-dropdown-avatar" aria-hidden="true">
                {initial}
              </span>
              <div>
                <p className="profile-dropdown-name">{user?.name}</p>
                <p className="profile-dropdown-email">{user?.email}</p>
              </div>
            </div>

            <div className="profile-dropdown-divider" />

            <button type="button" className="profile-dropdown-item" role="menuitem" onClick={openProfile}>
              <IconUser size={18} />
              My profile
            </button>
            <button type="button" className="profile-dropdown-item" role="menuitem" onClick={openPassword}>
              <IconLock size={18} />
              Change password
            </button>

            <div className="profile-dropdown-divider" />

            <button
              type="button"
              className="profile-dropdown-item is-danger"
              role="menuitem"
              onClick={handleLogout}
            >
              <IconLogOut size={18} />
              Log out
            </button>
          </div>
        ) : null}
      </div>

      <Modal title="My profile" open={profileOpen} onClose={() => setProfileOpen(false)}>
        {error ? <div className="crud-alert crud-alert--error">{error}</div> : null}
        {success ? <div className="crud-alert profile-alert--success">{success}</div> : null}
        <form className="profile-form" onSubmit={handleProfileSubmit}>
          <div className="crud-field">
            <label htmlFor="profile_name">Full name</label>
            <input
              id="profile_name"
              name="name"
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoComplete="name"
            />
          </div>
          <div className="crud-field">
            <label htmlFor="profile_email">Email</label>
            <input
              id="profile_email"
              name="email"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
            />
          </div>
          <div className="crud-field">
            <label htmlFor="profile_phone">Phone</label>
            <input
              id="profile_phone"
              name="phone"
              type="tel"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              autoComplete="tel"
              placeholder="Optional"
            />
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setProfileOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="Change password" open={passwordOpen} onClose={() => setPasswordOpen(false)}>
        {error ? <div className="crud-alert crud-alert--error">{error}</div> : null}
        {success ? <div className="crud-alert profile-alert--success">{success}</div> : null}
        <form className="profile-form" onSubmit={handlePasswordSubmit}>
          <div className="crud-field">
            <label htmlFor="current_password">Current password</label>
            <input
              id="current_password"
              name="current_password"
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current_password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="crud-field">
            <label htmlFor="new_password">New password</label>
            <input
              id="new_password"
              name="password"
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="crud-field">
            <label htmlFor="password_confirmation">Confirm new password</label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm((f) => ({ ...f, password_confirmation: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setPasswordOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default ProfileMenu;
