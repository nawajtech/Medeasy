import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  partnerLogin as apiLogin,
  partnerLogout as apiLogout,
  partnerMe,
  partnerRegister as apiRegister,
} from "../api/portal";
import { PARTNER_TOKEN_KEY, PARTNER_USER_KEY } from "../api/axios";

const PartnerAuthContext = createContext(null);

function readStoredPartner() {
  try {
    const raw = localStorage.getItem(PARTNER_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    localStorage.removeItem(PARTNER_USER_KEY);
    return null;
  }
}

export function PartnerAuthProvider({ children }) {
  const [partner, setPartner] = useState(readStoredPartner);
  const [token, setToken] = useState(() => localStorage.getItem(PARTNER_TOKEN_KEY));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(PARTNER_TOKEN_KEY)));

  const persist = useCallback((nextToken, nextPartner) => {
    setToken(nextToken);
    setPartner(nextPartner);
    if (nextToken && nextPartner) {
      localStorage.setItem(PARTNER_TOKEN_KEY, nextToken);
      localStorage.setItem(PARTNER_USER_KEY, JSON.stringify(nextPartner));
    } else {
      localStorage.removeItem(PARTNER_TOKEN_KEY);
      localStorage.removeItem(PARTNER_USER_KEY);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const storedToken = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return null;
    }

    try {
      const { data } = await partnerMe();
      const next = data?.partner ?? data;
      if (next?.id) {
        persist(storedToken, next);
        return next;
      }
      persist(null, null);
      return null;
    } catch (err) {
      if (err.response?.status === 401) {
        persist(null, null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    if (localStorage.getItem(PARTNER_TOKEN_KEY)) {
      refreshMe();
    } else {
      setLoading(false);
    }
  }, [refreshMe]);

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    persist(data.token, data.partner);
    setLoading(false);
    return data.partner;
  };

  const register = async (payload) => {
    const { data } = await apiRegister(payload);
    persist(data.token, data.partner);
    setLoading(false);
    return data.partner;
  };

  const logout = async () => {
    try {
      if (token) await apiLogout();
    } catch {
      /* ignore */
    }
    persist(null, null);
  };

  const value = useMemo(
    () => ({
      partner,
      token,
      loading,
      isAuthenticated: Boolean(token && partner?.id),
      login,
      register,
      logout,
      refreshMe,
      setPartner: (next) => persist(token, next),
    }),
    [partner, token, loading, persist, refreshMe]
  );

  return <PartnerAuthContext.Provider value={value}>{children}</PartnerAuthContext.Provider>;
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerAuthContext);
  if (!ctx) throw new Error("usePartnerAuth must be used within PartnerAuthProvider");
  return ctx;
}
