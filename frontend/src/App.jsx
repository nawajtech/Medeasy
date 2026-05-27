import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleRoute from "./auth/RoleRoute";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Doctors from "./pages/Doctors";
import DoctorAvailability from "./pages/DoctorAvailability";
import DoctorScheduleRedirect from "./pages/DoctorScheduleRedirect";
import Companies from "./pages/Companies";
import Departments from "./pages/Departments";
import Appointments from "./pages/Appointments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route element={<RoleRoute />}>
                <Route index element={<Dashboard />} />
                <Route path="companies" element={<Companies />} />
                <Route path="patients" element={<Patients />} />
                <Route path="departments" element={<Departments />} />
                <Route path="doctors" element={<Doctors />} />
                <Route path="my-schedule" element={<DoctorScheduleRedirect />} />
                <Route path="doctors/:doctorId/availability" element={<DoctorAvailability />} />
                <Route path="appointments" element={<Appointments />} />
                <Route path="reports" element={<Reports />} />
                <Route path="users" element={<Users />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
