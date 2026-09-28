import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import "./MainLayout.css";

function MainLayout() {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const isCenterChat = pathname.includes("/diagnostics/chats");

  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((open) => !open), []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape") setNavOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [navOpen]);

  return (
    <div className={`admin-wrapper${navOpen ? " nav-open" : ""}${isCenterChat ? " is-center-chat" : ""}`}>
      {navOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={closeNav}
        />
      ) : null}

      <Sidebar open={navOpen} onClose={closeNav} />

      <div className="admin-main">
        <Header onMenuClick={toggleNav} navOpen={navOpen} />

        <main className="admin-content">
          <Outlet />
        </main>

        {isCenterChat ? null : <Footer />}
      </div>
    </div>
  );
}

export default MainLayout;
