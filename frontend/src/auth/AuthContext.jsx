import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../api/auth";
import { ROLES } from "../config/roles";

const AuthContext = createContext(null);

const TOKEN_KEY = "medeasy_token";
const USER_KEY = "medeasy_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const persist = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return null;
    }
    try {
      const { data } = await getMe();
      persist(token, data.user);
      return data.user;
    } catch {
      persist(null, null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [persist, token]);

  useEffect(() => {
    if (token) {
      refreshMe();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    persist(data.token, data.user);
    return data.user;
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
      user,
      token,
      loading,
      login,
      logout,
      refreshMe,
      isAuthenticated: Boolean(token && user),
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      isCompanyAdmin: user?.role === ROLES.COMPANY_ADMIN,
      isDoctor: user?.role === ROLES.DOCTOR,
      isStaff: user?.role === ROLES.STAFF,
      companyId: user?.company_id ?? null,
    }),
    [user, token, loading, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
