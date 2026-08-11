import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { usePatientAuth } from "../auth/PatientAuthContext";

const links = [
  {
    to: "/",
    label: "Centres",
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20v-6h4v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/appointments",
    label: "Bookings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3.5V7M16 3.5V7M3.5 10h17" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
        <path d="M14 3.5V9h5.5M8.5 13h7M8.5 16.5h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/prescriptions",
    label: "Rx",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M8 4h5.5L18 8.5V20a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V5.5A1.5 1.5 0 0 1 8 4Z" />
        <path d="M9.5 13.5h5M9.5 16.5h3.5M12 8.5v2.5M10.5 9.75h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="9" r="3.2" />
        <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "P";
}

export default function PatientLayout() {
  const { patient, logout } = usePatientAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="pt-app">
      <header className="pt-header">
        <Link to="/" className="pt-header__brand">
          <span className="pt-logo" aria-hidden="true" />
          <div>
            <strong>ApnaMedi</strong>
            <span>Patient Portal</span>
          </div>
        </Link>

        <nav className="pt-nav pt-nav--desktop" aria-label="Patient">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
            >
              {link.label === "Rx" ? "Prescriptions" : link.label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-header__user">
          <span className="pt-header__avatar" aria-hidden="true">
            {initials(patient?.name)}
          </span>
          <span className="pt-header__name">{patient?.name}</span>
          <button type="button" className="pt-btn pt-btn--ghost pt-header__logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="pt-main">
        <Outlet />
      </main>

      <footer className="pt-footer">
        <span className="pt-powered">
          Powered by <strong>ApnaMedi</strong>
        </span>
      </footer>

      <nav className="pt-bottom-nav" aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? "is-active" : undefined)}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
