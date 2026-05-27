import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function DoctorScheduleRedirect() {
  const { user } = useAuth();

  if (!user?.doctor_id) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/doctors/${user.doctor_id}/availability`} replace />;
}

export default DoctorScheduleRedirect;
