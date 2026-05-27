import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./Header.css";
import { IconSearch, IconBell, IconChevronRight } from "./icons";
import { getRouteMeta } from "../routeConfig";

function Header() {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);
  const { user, logout } = useAuth();
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <header className="top-header">
      <div className="header-left">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>MedEasy</span>
          <IconChevronRight />
          <span className="breadcrumb-current">{meta.breadcrumb}</span>
        </nav>
        <div className="header-greeting">
          <h1>{meta.title}</h1>
          <p>
            {pathname === "/" ? (
              <>
                Welcome back, <strong>{user?.name || "User"}</strong> — here&apos;s your clinic overview.
              </>
            ) : (
              meta.description
            )}
          </p>
        </div>
      </div>

      <div className="header-right">
        <label className="search-field">
          <span className="search-icon">
            <IconSearch />
          </span>
          <input type="search" placeholder="Search patients, doctors..." aria-label="Search" />
          <kbd className="search-shortcut" aria-hidden="true">
            /
          </kbd>
        </label>

        <button type="button" className="icon-btn notification-btn" aria-label="Notifications">
          <IconBell />
          <span className="notification-badge">3</span>
        </button>

        <div className="header-divider" aria-hidden="true" />

        <button type="button" className="profile" onClick={() => logout()} aria-label="Sign out">
          <span className="profile-avatar">{initial}</span>
          <span className="profile-meta">
            <span className="profile-name">{user?.name}</span>
            <span className="profile-role">{user?.role?.replace("_", " ")}</span>
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;
