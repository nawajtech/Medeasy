import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as apiLogin, logout as apiLogout } from "../api/auth";
import { hasPermission } from "../config/permissions";
import { ROLES } from "../config/roles";

const AuthContext = createContext(null);

const TOKEN_KEY = "medeasy_token";
const USER_KEY = "medeasy_user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const persist = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken && nextUser) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return null;
    }

    try {
      const { data } = await getMe();
      const nextUser = data?.user ?? data;
      if (nextUser?.id) {
        persist(storedToken, nextUser);
        return nextUser;
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
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      refreshMe();
    } else {
      setLoading(false);
    }
  }, [refreshMe]);

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    persist(data.token, data.user);
    setLoading(false);
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

  const updateUser = useCallback(
    (nextUser) => {
      if (token && nextUser?.id) {
        persist(token, nextUser);
      }
    },
    [persist, token]
  );

  const can = useCallback(
    (permission) => hasPermission(user?.permissions, permission),
    [user?.permissions]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      refreshMe,
      updateUser,
      can,
      isAuthenticated: Boolean(token && user),
      isSuperAdmin:    user?.role === ROLES.SUPER_ADMIN,
      isCompanyAdmin:  user?.role === ROLES.COMPANY_ADMIN,
      isDoctor:        user?.role === ROLES.DOCTOR,
      isStaff:         user?.role === ROLES.STAFF,
      isLabTechnician: user?.role === ROLES.LAB_TECHNICIAN,
      isRadiologist:   user?.role === ROLES.RADIOLOGIST,
      isReceptionist:  user?.role === ROLES.RECEPTIONIST,
      companyId: user?.company_id ?? null,
    }),
    [user, token, loading, refreshMe, updateUser, can]
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
