import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PatientAuthProvider } from "./auth/PatientAuthContext";
import PatientProtectedRoute from "./auth/PatientProtectedRoute";
import PatientLayout from "./layouts/PatientLayout";
import PatientLogin from "./pages/PatientLogin";
import PatientRegister from "./pages/PatientRegister";
import Centres from "./pages/Centres";
import CentreBooking from "./pages/CentreBooking";
import Appointments from "./pages/Appointments";
import AppointmentDetail from "./pages/AppointmentDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import PatientProfile from "./pages/PatientProfile";
import PatientReports from "./pages/PatientReports";
import PatientPrescriptions from "./pages/PatientPrescriptions";
import "./styles/patient.css";

export default function PatientApp() {
  useEffect(() => {
    document.title = "ApnaMedi Patient";
  }, []);

  return (
    <BrowserRouter>
      <PatientAuthProvider>
        <Routes>
          <Route path="/login" element={<PatientLogin />} />
          <Route path="/register" element={<PatientRegister />} />
          <Route element={<PatientProtectedRoute />}>
            <Route element={<PatientLayout />}>
              <Route index element={<Centres />} />
              <Route path="centres/:centreId" element={<CentreBooking />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="appointments/:orderId" element={<AppointmentDetail />} />
              <Route path="appointments/:orderId/confirmation" element={<BookingConfirmation />} />
              <Route path="reports" element={<PatientReports />} />
              <Route path="prescriptions" element={<PatientPrescriptions />} />
              <Route path="profile" element={<PatientProfile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PatientAuthProvider>
    </BrowserRouter>
  );
}
