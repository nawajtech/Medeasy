import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { menuByRole } from "../config/roles";
import "./Sidebar.css";
import {
  IconDashboard,
  IconPatient,
  IconUsers,
  IconStethoscope,
  IconCalendar,
  IconChart,
  IconSettings,
  IconHeartPulse,
  IconBuilding,
} from "./icons";

const iconMap = {
  Overview: IconDashboard,
  Companies: IconBuilding,
  Patients: IconPatient,
  Departments: IconChart,
  Doctors: IconStethoscope,
  Appointments: IconCalendar,
  "My appointments": IconCalendar,
  "My patients": IconPatient,
  Reports: IconChart,
  Users: IconUsers,
  Staff: IconUsers,
  Settings: IconSettings,
};

function Sidebar() {
  const { user } = useAuth();
  const items = menuByRole[user?.role] || [];

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-inner">
        <Link to="/" className="brand">
          <div className="brand-icon">
            <IconHeartPulse size={22} />
          </div>
          <div className="brand-text">
            <span className="brand-name">MedEasy</span>
            <span className="brand-tagline">
              {user?.company?.name || "Healthcare SaaS"}
            </span>
          </div>
        </Link>

        <nav className="menu">
          <div className="menu-section">
            <span className="menu-label">Menu</span>
            <ul className="menu-list">
              {items.map((item) => {
                const Icon = iconMap[item.label] || IconDashboard;
                return (
                  <li key={item.to + item.label}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => (isActive ? "active" : undefined)}
                    >
                      <span className="menu-icon">
                        <Icon />
                      </span>
                      <span className="menu-text">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <p className="sidebar-footer-title">{user?.name}</p>
            <p className="sidebar-footer-desc">{user?.role?.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
