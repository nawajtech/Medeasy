import axios from "axios";
import { API_BASE_URL } from "../../config/env";

export const PARTNER_TOKEN_KEY = "apna_medi_partner_token";
export const PARTNER_USER_KEY = "apna_medi_partner";

const partnerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

partnerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(PARTNER_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === "function") {
      config.headers.delete("Content-Type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
    }
  }
  return config;
});

partnerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthRequest =
      url.includes("/partner/auth/login") ||
      url.includes("/partner/auth/register") ||
      url.includes("/partner/auth/me") ||
      url.includes("/partner/auth/otp") ||
      url.includes("/partner/auth/forgot-password");

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem(PARTNER_TOKEN_KEY);
      localStorage.removeItem(PARTNER_USER_KEY);
      const path = window.location.pathname || "";
      if (path !== "/login" && path !== "/register" && path !== "/forgot-password") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default partnerApi;
