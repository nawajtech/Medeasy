import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { filterMenuByPermissions, groupMenuItems } from "../config/permissions";
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
  IconFlask,
  IconRadiology,
  IconBranch,
  IconClipboard,
  IconPill,
  IconDollar,
} from "./icons";

const iconMap = {
  Overview: IconDashboard,
  Companies: IconBuilding,
  Branches: IconBranch,
  Patients: IconPatient,
  Departments: IconChart,
  Doctors: IconStethoscope,
  Appointments: IconCalendar,
  "My appointments": IconCalendar,
  "My patients": IconPatient,
  "My schedule": IconCalendar,
  "Lab Catalog": IconFlask,
  "Lab Orders": IconClipboard,
  "Today's appointments": IconCalendar,
  "Diagnostic Catalog": IconRadiology,
  "Diagnostic Orders": IconClipboard,
  "Medicine Master": IconPill,
  Reports: IconChart,
  "Finance & P&L": IconDollar,
  Users: IconUsers,
  Roles: IconUsers,
  Settings: IconSettings,
};

const sectionIconMap = {
  overview: IconDashboard,
  clinic: IconStethoscope,
  laboratory: IconFlask,
  diagnostics: IconRadiology,
  finance: IconDollar,
  admin: IconSettings,
};

function Sidebar() {
  const { user } = useAuth();
  const items = filterMenuByPermissions(user?.permissions, user?.role, user?.company?.modules);
  const groups = groupMenuItems(items);

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
          {groups.map((group) => {
            const SectionIcon = sectionIconMap[group.id] || IconDashboard;
            return (
              <div
                className={`menu-section menu-section--${group.id}`}
                key={group.id}
              >
                <div className="menu-section-head">
                  <span className="menu-section-icon" aria-hidden="true">
                    <SectionIcon size={14} />
                  </span>
                  <div className="menu-section-titles">
                    <span className="menu-label">{group.label}</span>
                    {group.description ? (
                      <span className="menu-sublabel">{group.description}</span>
                    ) : null}
                  </div>
                </div>
                <ul className="menu-list">
                  {group.items.map((item) => {
                    const Icon = iconMap[item.label] || IconDashboard;
                    return (
                      <li key={item.to + item.label}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          className={({ isActive }) => (isActive ? "active" : undefined)}
                        >
                          <span className="menu-icon"><Icon size={20} /></span>
                          <span className="menu-text">{item.label}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <span className="sidebar-profile-avatar" aria-hidden="true">
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </span>
            <div className="sidebar-profile-meta">
              <p className="sidebar-footer-title">{user?.name}</p>
              <p className="sidebar-footer-desc">{user?.role?.replace(/_/g, " ")}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
