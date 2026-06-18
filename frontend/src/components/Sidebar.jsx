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
  IconFlask,
  IconRadiology,
  IconBranch,
  IconClipboard,
} from "./icons";

const LAB_LABELS = new Set(["Lab Catalog", "Lab Orders"]);
const DIAGNOSTICS_LABELS = new Set(["Diagnostics"]);
const ADMIN_LABELS = new Set(["Companies", "Branches", "Users", "Staff", "Reports", "Settings"]);

function groupMenuItems(items) {
  const general = [], lab = [], diagnostics = [], admin = [];
  for (const item of items) {
    if (LAB_LABELS.has(item.label)) lab.push(item);
    else if (DIAGNOSTICS_LABELS.has(item.label)) diagnostics.push(item);
    else if (ADMIN_LABELS.has(item.label)) admin.push(item);
    else general.push(item);
  }
  const groups = [];
  if (general.length) groups.push({ label: "Menu", items: general });
  if (lab.length) groups.push({ label: "Laboratory", items: lab });
  if (diagnostics.length) groups.push({ label: "Diagnostics", items: diagnostics });
  if (admin.length) groups.push({ label: "Admin", items: admin });
  return groups;
}

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
  Diagnostics: IconRadiology,
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
          {groupMenuItems(items).map((group) => (
            <div className="menu-section" key={group.label}>
              <span className="menu-label">{group.label}</span>
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
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-card">
            <span className="sidebar-profile-avatar" aria-hidden="true">
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </span>
            <div className="sidebar-profile-meta">
              <p className="sidebar-footer-title">{user?.name}</p>
              <p className="sidebar-footer-desc">{user?.role?.replace("_", " ")}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
