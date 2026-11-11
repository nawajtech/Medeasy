import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PartnerAuthProvider } from "./auth/PartnerAuthContext";
import PartnerProtectedRoute from "./auth/PartnerProtectedRoute";
import PartnerLayout from "./layouts/PartnerLayout";
import PartnerLogin from "./pages/PartnerLogin";
import PartnerRegister from "./pages/PartnerRegister";
import PartnerForgotPassword from "./pages/PartnerForgotPassword";
import PartnerDashboard from "./pages/PartnerDashboard";
import ExploreCentres from "./pages/ExploreCentres";
import CentreDetail from "./pages/CentreDetail";
import PartnershipRequests from "./pages/PartnershipRequests";
import MyReferrals from "./pages/MyReferrals";
import ReferralDetail from "./pages/ReferralDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import PartnerEarnings from "./pages/PartnerEarnings";
import PartnerProfile from "./pages/PartnerProfile";
import "./styles/partner.css";

export default function PartnerApp() {
  useEffect(() => {
    document.title = "ApnaMedi Partner Portal";
  }, []);

  return (
    <BrowserRouter>
      <PartnerAuthProvider>
        <Routes>
          <Route path="/login" element={<PartnerLogin />} />
          <Route path="/register" element={<PartnerRegister />} />
          <Route path="/forgot-password" element={<PartnerForgotPassword />} />
          <Route element={<PartnerProtectedRoute />}>
            <Route element={<PartnerLayout />}>
              <Route index element={<PartnerDashboard />} />
              <Route path="centres" element={<ExploreCentres />} />
              <Route path="centres/:centreId" element={<CentreDetail />} />
              <Route path="centres/:centreId/book" element={<CentreDetail />} />
              <Route path="requests" element={<PartnershipRequests />} />
              <Route path="referrals" element={<MyReferrals />} />
              <Route path="referrals/:orderId" element={<ReferralDetail />} />
              <Route path="referrals/:orderId/confirmation" element={<BookingConfirmation />} />
              <Route path="earnings" element={<PartnerEarnings />} />
              <Route path="profile" element={<PartnerProfile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PartnerAuthProvider>
    </BrowserRouter>
  );
}
