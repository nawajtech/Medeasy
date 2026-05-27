import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Footer from "../components/Footer";
import "./MainLayout.css";

function MainLayout() {
  return (
    <div className="admin-wrapper">
      <Sidebar />

      <div className="admin-main">
        <Header />

        <main className="admin-content">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default MainLayout;
