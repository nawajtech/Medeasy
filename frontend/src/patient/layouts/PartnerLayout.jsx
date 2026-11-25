import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPartnerCenterChatUnread } from "../api/portal";
import { usePartnerAuth } from "../auth/PartnerAuthContext";

const Icon = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  ),
  centres: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 6.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
      <path d="M8 10.5h8M8 13.5h5" strokeLinecap="round" />
    </svg>
  ),
  requests: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 7h8M8 12h8M8 17h5" strokeLinecap="round" />
      <rect x="4" y="3.5" width="16" height="17" rx="2" />
    </svg>
  ),
  referrals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" strokeLinecap="round" />
    </svg>
  ),
  earnings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 10.5c.6-1 1.5-1.5 2.5-1.5s2 .6 2 1.8-1 1.7-2.5 2.1-2.5.8-2.5 2.1c0 1.2 1.1 1.9 2.5 1.9s2-.5 2.5-1.4" strokeLinecap="round" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="9" r="3.2" />
      <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" strokeLinecap="round" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" strokeLinecap="round" />
      <path d="M16 8l4 4-4 4M20 12H10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const SIDEBAR_LINKS = [
  { to: "/", label: "Dashboard", end: true, icon: Icon.home },
  { to: "/centres", label: "Centres", icon: Icon.centres },
  { to: "/chats", label: "Chats", icon: Icon.chats },
  { to: "/requests", label: "Requests", icon: Icon.requests },
  { to: "/referrals", label: "Referrals", icon: Icon.referrals },
  { to: "/earnings", label: "Earnings", icon: Icon.earnings },
  { to: "/profile", label: "Profile", icon: Icon.profile },
];

const BOTTOM_LINKS = [
  { to: "/", label: "Home", end: true, icon: Icon.home },
  { to: "/centres", label: "Centres", icon: Icon.centres },
  { to: "/chats", label: "Chats", icon: Icon.chats },
  { to: "/referrals", label: "Referrals", icon: Icon.referrals },
];

const MORE_LINKS = [
  { to: "/requests", label: "Requests", icon: Icon.requests },
  { to: "/earnings", label: "Earnings", icon: Icon.earnings },
  { to: "/profile", label: "Profile", icon: Icon.profile },
];

const PAGE_TITLES = [
  { match: /^\/centres\/[^/]+/, title: "Centre details" },
  { match: /^\/centres/, title: "Centres" },
  { match: /^\/chats/, title: "Chats" },
  { match: /^\/requests/, title: "Requests" },
  { match: /^\/referrals\/[^/]+/, title: "Referral" },
  { match: /^\/referrals/, title: "Referrals" },
  { match: /^\/earnings/, title: "Earnings" },
  { match: /^\/profile/, title: "Profile" },
  { match: /^\/$/, title: "Dashboard" },
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

function pageTitle(pathname) {
  return PAGE_TITLES.find((row) => row.match.test(pathname))?.title || "Partner";
}

export default function PartnerLayout() {
  const { partner, logout } = usePartnerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chatUnread, setChatUnread] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const title = useMemo(() => pageTitle(location.pathname), [location.pathname]);
  const moreActive = MORE_LINKS.some((link) => location.pathname.startsWith(link.to));

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
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    navigate("/login");
  };

  const navClass = ({ isActive }) => (isActive ? "is-active" : undefined);

  return (
    <div className="pt-app">
      <aside className="pt-sidebar" aria-label="Partner navigation">
        <Link to="/" className="pt-sidebar__brand">
          <img src="/apnamedi-logo.png" alt="ApnaMedi" className="pt-logo-full" />
          <span className="pt-sidebar__badge">Partner</span>
        </Link>

        <nav className="pt-sidebar__nav">
          {SIDEBAR_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
              <span className="pt-nav__icon">{link.icon}</span>
              <span className="pt-nav__label">{link.label}</span>
              {link.to === "/chats" && chatUnread > 0 ? (
                <span className="pt-nav-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="pt-sidebar__footer">
          <Link to="/profile" className="pt-sidebar__user">
            <span className="pt-avatar" aria-hidden="true">
              {initials(partner?.name)}
            </span>
            <span className="pt-sidebar__user-meta">
              <strong>{partner?.name || "Partner"}</strong>
              <span>{partner?.email || "View profile"}</span>
            </span>
          </Link>
          <button type="button" className="pt-sidebar__logout" onClick={handleLogout}>
            <span className="pt-nav__icon">{Icon.logout}</span>
            Log out
          </button>
        </div>
      </aside>

      <div className="pt-shell">
        <header className="pt-topbar">
          <div className="pt-topbar__copy">
            <p className="pt-topbar__eyebrow">ApnaMedi Partner</p>
            <h1 className="pt-topbar__title">{title}</h1>
          </div>
          <Link to="/profile" className="pt-topbar__profile" aria-label="Open profile">
            <span className="pt-avatar" aria-hidden="true">
              {initials(partner?.name)}
            </span>
          </Link>
        </header>

        <main className="pt-main">
          <div className="pt-main__inner">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="pt-bottom-nav" aria-label="Primary">
        {BOTTOM_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
            <span className="pt-bottom-nav__icon">
              {link.icon}
              {link.to === "/chats" && chatUnread > 0 ? (
                <span className="pt-nav-badge pt-nav-badge--dot">{chatUnread > 9 ? "9+" : chatUnread}</span>
              ) : null}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`pt-bottom-nav__more${moreOpen || moreActive ? " is-active" : ""}`}
          aria-expanded={moreOpen}
          aria-controls="pt-more-sheet"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span className="pt-bottom-nav__icon">{Icon.more}</span>
          <span>More</span>
        </button>
      </nav>

      <div
        className={`pt-sheet-backdrop${moreOpen ? " is-open" : ""}`}
        aria-hidden={!moreOpen}
        onClick={() => setMoreOpen(false)}
      />
      <div
        id="pt-more-sheet"
        className={`pt-sheet${moreOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="More options"
        aria-hidden={!moreOpen}
      >
        <div className="pt-sheet__handle" aria-hidden="true" />
        <p className="pt-sheet__title">More</p>
        <div className="pt-sheet__list">
          {MORE_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navClass} onClick={() => setMoreOpen(false)}>
              <span className="pt-nav__icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
          <button type="button" className="pt-sheet__logout" onClick={handleLogout}>
            <span className="pt-nav__icon">{Icon.logout}</span>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
