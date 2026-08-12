import axios from "axios";
import { API_BASE_URL } from "../../config/env";

export const PATIENT_TOKEN_KEY = "apna_medi_patient_token";
export const PATIENT_USER_KEY = "apna_medi_patient";

const patientApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

patientApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(PATIENT_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

patientApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthRequest =
      url.includes("/patient/auth/login") ||
      url.includes("/patient/auth/register") ||
      url.includes("/patient/auth/me");

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem(PATIENT_TOKEN_KEY);
      localStorage.removeItem(PATIENT_USER_KEY);
      const path = window.location.pathname || "";
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default patientApi;
