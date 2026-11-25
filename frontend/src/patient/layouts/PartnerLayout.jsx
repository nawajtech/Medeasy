import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPartnerCenterChatUnread } from "../api/portal";
import { usePartnerAuth } from "../auth/PartnerAuthContext";

const links = [
  {
    to: "/",
    label: "Dashboard",
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/centres",
    label: "Centres",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/chats",
    label: "Chats",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
        <path d="M8 10.5h8M8 13.5h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/requests",
    label: "Requests",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 7h8M8 12h8M8 17h5" strokeLinecap="round" />
        <rect x="4" y="3.5" width="16" height="17" rx="2" />
      </svg>
    ),
  },
  {
    to: "/referrals",
    label: "Referrals",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3.5V7M16 3.5V7M3.5 10h17" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/earnings",
    label: "Earnings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path
          d="M12 7.5v9M9.5 10.5c.6-1 1.5-1.5 2.5-1.5s2 .6 2 1.8-1 1.7-2.5 2.1-2.5.8-2.5 2.1c0 1.2 1.1 1.9 2.5 1.9s2-.5 2.5-1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "P"
  );
}

export default function PartnerLayout() {
  const { partner, logout } = usePartnerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chatUnread, setChatUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await getPartnerCenterChatUnread();
        if (active) setChatUnread(Number(data?.unread_count) || 0);
      } catch {
        if (active) setChatUnread(0);
      }
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!profileOpen && !menuOpen) return undefined;
    const onPointer = (event) => {
      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen, menuOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const renderNavLink = (link, { onNavigate } = {}) => (
    <NavLink
      key={link.to}
      to={link.to}
      end={link.end}
      className={({ isActive }) => (isActive ? "is-active" : undefined)}
      onClick={() => onNavigate?.()}
    >
      <span className="pt-nav__icon">{link.icon}</span>
      <span className="pt-nav__label">{link.label}</span>
      {link.to === "/chats" && chatUnread > 0 ? (
        <span className="pt-nav-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>
      ) : null}
    </NavLink>
  );

  return (
    <div className="pt-app">
      <header className="pt-header">
        <div className="pt-header__left">
          <button
            type="button"
            className="pt-header__menu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="pt-mobile-drawer"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <Link to="/" className="pt-header__brand">
            <img src="/apnamedi-logo.png" alt="ApnaMedi" className="pt-logo-full" />
            <span className="pt-header__portal">Partner</span>
          </Link>
        </div>

        <nav className="pt-nav pt-nav--desktop" aria-label="Partner">
          {links.map((link) => renderNavLink(link))}
        </nav>

        <div className="pt-header__user" ref={profileRef}>
          <button
            type="button"
            className="pt-header__profile-btn"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="pt-header__avatar" aria-hidden="true">
              {initials(partner?.name)}
            </span>
            <span className="pt-header__name">{partner?.name || "Partner"}</span>
            <svg className="pt-header__caret" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {profileOpen ? (
            <div className="pt-profile-menu" role="menu">
              <div className="pt-profile-menu__meta">
                <strong>{partner?.name || "Partner"}</strong>
                <span>{partner?.email || partner?.type || "Partner account"}</span>
              </div>
              <Link to="/profile" role="menuitem" className="pt-profile-menu__item" onClick={() => setProfileOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="9" r="3.2" />
                  <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" strokeLinecap="round" />
                </svg>
                Profile
              </Link>
              <button type="button" role="menuitem" className="pt-profile-menu__item pt-profile-menu__item--danger" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" strokeLinecap="round" />
                  <path d="M16 8l4 4-4 4M20 12H10" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div
        className={`pt-drawer-backdrop${menuOpen ? " is-open" : ""}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="pt-mobile-drawer"
        className={`pt-drawer${menuOpen ? " is-open" : ""}`}
        aria-hidden={!menuOpen}
        aria-label="Mobile navigation"
      >
        <div className="pt-drawer__head">
          <div>
            <p className="pt-drawer__eyebrow">Partner Portal</p>
            <strong>{partner?.name || "Partner"}</strong>
          </div>
          <button type="button" className="pt-drawer__close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="pt-drawer__nav" aria-label="Partner mobile">
          {links.map((link) => renderNavLink(link, { onNavigate: () => setMenuOpen(false) }))}
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? "is-active" : undefined)}
            onClick={() => setMenuOpen(false)}
          >
            <span className="pt-nav__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="9" r="3.2" />
                <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" strokeLinecap="round" />
              </svg>
            </span>
            <span className="pt-nav__label">Profile</span>
          </NavLink>
        </nav>
        <div className="pt-drawer__footer">
          <button type="button" className="pt-btn pt-btn--ghost pt-btn--block" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="pt-main">
        <div className="pt-main__inner">
          <Outlet />
        </div>
      </main>

      <footer className="pt-footer">
        <span className="pt-powered">
          Powered by{" "}
          <strong>
            <span className="pt-brand-apna">Apna</span>
            <span className="pt-brand-medi">Medi</span>
          </strong>
        </span>
      </footer>
    </div>
  );
}
