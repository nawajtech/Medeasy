import patientApi from "./axios";

export const patientRegister = (payload) => patientApi.post("/patient/auth/register", payload);
export const patientLogin = (payload) => patientApi.post("/patient/auth/login", payload);
export const patientMe = () => patientApi.get("/patient/auth/me");
export const patientLogout = () => patientApi.post("/patient/auth/logout");
export const patientUpdateProfile = (payload) => patientApi.put("/patient/auth/profile", payload);
export const patientChangePassword = (payload) => patientApi.put("/patient/auth/password", payload);

export const listCentres = (params) => patientApi.get("/patient/centres", { params });
export const getCentre = (id) => patientApi.get(`/patient/centres/${id}`);
export const getCentreServices = (id) => patientApi.get(`/patient/centres/${id}/services`);
export const getCentreSlots = (id, params) => patientApi.get(`/patient/centres/${id}/slots`, { params });
export const lookupReferral = (id, params) => patientApi.get(`/patient/centres/${id}/referral`, { params });


export const bookAppointment = (payload) => patientApi.post("/patient/bookings", payload);
export const listAppointments = (params) => patientApi.get("/patient/appointments", { params });
export const getAppointment = (id) => patientApi.get(`/patient/appointments/${id}`);
export const cancelAppointment = (id) => patientApi.post(`/patient/appointments/${id}/cancel`);
export const rescheduleAppointment = (id, payload) =>
  patientApi.post(`/patient/appointments/${id}/reschedule`, payload);

export const listReports = () => patientApi.get("/patient/reports");
export const listPrescriptions = () => patientApi.get("/patient/prescriptions");
