import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "../notifications/NotificationContext";
import { getPatients } from "../api/patients";
import { getDoctors } from "../api/doctors";
import { DOCTOR_TYPE_LABELS, doctorsPathForType } from "../config/doctorTypes";
import "./Header.css";
import "./NotificationToast.css";
import { IconSearch, IconBell, IconChevronRight, IconMenu, IconX } from "./icons";
import ProfileMenu from "./ProfileMenu";
import { getRouteMeta } from "../routeConfig";

const SEARCH_RESULT_LIMIT = 5;

function formatTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Header({ onMenuClick, navOpen = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = getRouteMeta(pathname);
  const { user, branding } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    pushStatus,
    pushError,
    enablePushNotifications,
    refreshNotifications,
  } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const panelRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState({ patients: [], doctors: [] });
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchRequestIdRef = useRef(0);

  const runGlobalSearch = useCallback(async (term) => {
    const requestId = ++searchRequestIdRef.current;
    setSearchLoading(true);
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        getPatients({ search: term, limit: SEARCH_RESULT_LIMIT }),
        getDoctors({ search: term, limit: SEARCH_RESULT_LIMIT }),
      ]);
      if (requestId !== searchRequestIdRef.current) return;
      setSearchResults({
        patients: patientsRes.data || [],
        doctors: doctorsRes.data || [],
      });
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return;
      console.error("[GlobalSearch] Failed to search:", error);
      setSearchResults({ patients: [], doctors: [] });
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setSearchLoading(false);
      }
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSearchOpen(true);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const term = value.trim();
    if (term.length < 2) {
      searchRequestIdRef.current += 1;
      setSearchLoading(false);
      setSearchResults({ patients: [], doctors: [] });
      return;
    }

    searchDebounceRef.current = setTimeout(() => runGlobalSearch(term), 300);
  };

  const goToPatients = useCallback(
    (term) => {
      navigate(`/patients?q=${encodeURIComponent(term)}`);
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults({ patients: [], doctors: [] });
    },
    [navigate]
  );

  const goToDoctors = useCallback(
    (term, doctorType = "clinic") => {
      navigate(`${doctorsPathForType(doctorType)}?q=${encodeURIComponent(term)}`);
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults({ patients: [], doctors: [] });
    },
    [navigate]
  );

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      searchInputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      const term = searchQuery.trim();
      if (!term) return;
      if (searchResults.patients.length > 0) {
        goToPatients(term);
      } else if (searchResults.doctors.length > 0) {
        goToDoctors(term, searchResults.doctors[0]?.doctor_type);
      } else {
        goToPatients(term);
      }
    }
  };

  useEffect(() => {
    function handleGlobalKeydown(event) {
      if (event.key !== "/" || searchOpen) return;
      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isTyping) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    }

    document.addEventListener("keydown", handleGlobalKeydown);
    return () => document.removeEventListener("keydown", handleGlobalKeydown);
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutsideSearch(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutsideSearch);
    }

    return () => document.removeEventListener("mousedown", handleClickOutsideSearch);
  }, [searchOpen]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const trimmedQuery = searchQuery.trim();
  const hasSearchResults = searchResults.patients.length > 0 || searchResults.doctors.length > 0;

  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    setLoadingList(true);
    refreshNotifications()
      .catch((error) => console.error("[Notifications] Failed to refresh:", error))
      .finally(() => setLoadingList(false));
  }, [panelOpen, refreshNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setPanelOpen(false);
      }
    }

    if (panelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  return (
    <header className="top-header">
      <div className="header-left">
        <div className="header-title-row">
          {typeof onMenuClick === "function" ? (
            <button
              type="button"
              className="icon-btn header-menu-btn"
              aria-label={navOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={navOpen}
              aria-controls="main-navigation"
              onClick={onMenuClick}
            >
              {navOpen ? <IconX /> : <IconMenu />}
            </button>
          ) : null}

          <div className="header-titles">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span>{branding?.name || "ApnaMedi"}</span>
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
        </div>
      </div>

      <div className="header-right">
        <div className="search-field-wrap" ref={searchRef}>
          <label className="search-field">
            <span className="search-icon">
              <IconSearch />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search patients, doctors..."
              aria-label="Search patients or doctors by name or mobile number"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
            />
            {!searchQuery && (
              <kbd className="search-shortcut" aria-hidden="true">
                /
              </kbd>
            )}
          </label>

          {searchOpen && trimmedQuery.length >= 2 ? (
            <div className="global-search-panel">
              {searchLoading ? (
                <p className="global-search-empty">Searching…</p>
              ) : !hasSearchResults ? (
                <p className="global-search-empty">
                  No patients or doctors matched &ldquo;{trimmedQuery}&rdquo;.
                </p>
              ) : (
                <>
                  {searchResults.patients.length > 0 && (
                    <div className="global-search-section">
                      <div className="global-search-section-title">Patients</div>
                      {searchResults.patients.map((patient) => (
                        <button
                          type="button"
                          key={`patient-${patient.id}`}
                          className="global-search-result"
                          onClick={() => goToPatients(trimmedQuery)}
                        >
                          <span className="global-search-result-name">{patient.name}</span>
                          <span className="global-search-result-meta">
                            {patient.phone || "—"}
                            {patient.patient_code ? ` · ${patient.patient_code}` : ""}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="global-search-viewall"
                        onClick={() => goToPatients(trimmedQuery)}
                      >
                        View all patients matching &ldquo;{trimmedQuery}&rdquo;
                      </button>
                    </div>
                  )}

                  {searchResults.doctors.length > 0 && (
                    <div className="global-search-section">
                      <div className="global-search-section-title">Doctors</div>
                      {searchResults.doctors.map((doctor) => (
                        <button
                          type="button"
                          key={`doctor-${doctor.id}`}
                          className="global-search-result"
                          onClick={() => goToDoctors(trimmedQuery, doctor.doctor_type)}
                        >
                          <span className="global-search-result-name">{doctor.user?.name}</span>
                          <span className="global-search-result-meta">
                            {DOCTOR_TYPE_LABELS[doctor.doctor_type] || "Clinic"}
                            {doctor.user?.phone ? ` · ${doctor.user.phone}` : ""}
                            {doctor.department?.name ? ` · ${doctor.department.name}` : ""}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="global-search-viewall"
                        onClick={() => goToDoctors(trimmedQuery, searchResults.doctors[0]?.doctor_type)}
                      >
                        View all doctors matching &ldquo;{trimmedQuery}&rdquo;
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="notification-btn-wrap" ref={panelRef}>
          <button
            type="button"
            className="icon-btn notification-btn"
            aria-label="Notifications"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <IconBell />
            {unreadCount > 0 ? (
              <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </button>

          {panelOpen ? (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <div>
                  <h2>Notifications</h2>
                  {unreadCount > 0 ? (
                    <p className="notification-panel-subtitle">{unreadCount} unread</p>
                  ) : null}
                </div>
                <div className="notification-panel-actions">
                  {notifications.length > 0 && unreadCount > 0 ? (
                    <button type="button" onClick={markAllAsRead}>
                      Mark all read
                    </button>
                  ) : null}
                  {notifications.length > 0 ? (
                    <button
                      type="button"
                      className="notification-action-danger"
                      onClick={clearAll}
                    >
                      Clear all
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="notification-panel-list">
                {loadingList ? (
                  <p className="notification-panel-empty">Loading notifications…</p>
                ) : notifications.length === 0 ? (
                  <div className="notification-panel-empty-state">
                    <span className="notification-empty-icon" aria-hidden="true">
                      🔔
                    </span>
                    <p className="notification-panel-empty-title">No notifications yet</p>
                    <p className="notification-panel-empty">
                      {user?.role === "doctor"
                        ? "New appointments will appear here."
                        : "Notifications for your account will appear here."}
                    </p>
                    {pushStatus === "error" ? (
                      <div className="notification-panel-status error">
                        <p>{pushError}</p>
                        <button type="button" onClick={() => enablePushNotifications()}>
                          Enable push alerts
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`notification-item${item.read ? "" : " unread"}`}
                    >
                      <button
                        type="button"
                        className="notification-item-main"
                        onClick={() => markAsRead(item.id)}
                      >
                        <div className="notification-item-top">
                          {!item.read ? <span className="notification-unread-dot" aria-hidden="true" /> : null}
                          <p className="notification-item-title">{item.title}</p>
                        </div>
                        {item.body ? <p className="notification-item-body">{item.body}</p> : null}
                        <p className="notification-item-time">{formatTime(item.receivedAt)}</p>
                      </button>
                      <button
                        type="button"
                        className="notification-item-delete"
                        aria-label="Delete notification"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(item.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && pushStatus === "ready" ? (
                <p className="notification-panel-footer">Push alerts enabled on this device</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="header-divider" aria-hidden="true" />

        <ProfileMenu />
      </div>
    </header>
  );
}

export default Header;
