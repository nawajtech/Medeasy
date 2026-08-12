import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  patientLogin as apiLogin,
  patientLogout as apiLogout,
  patientMe,
  patientRegister as apiRegister,
} from "../api/portal";
import { PATIENT_TOKEN_KEY, PATIENT_USER_KEY } from "../api/axios";

const PatientAuthContext = createContext(null);

function readStoredPatient() {
  try {
    const raw = localStorage.getItem(PATIENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    localStorage.removeItem(PATIENT_USER_KEY);
    return null;
  }
}

export function PatientAuthProvider({ children }) {
  const [patient, setPatient] = useState(readStoredPatient);
  const [token, setToken] = useState(() => localStorage.getItem(PATIENT_TOKEN_KEY));
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(PATIENT_TOKEN_KEY)));

  const persist = useCallback((nextToken, nextPatient) => {
    setToken(nextToken);
    setPatient(nextPatient);
    if (nextToken && nextPatient) {
      localStorage.setItem(PATIENT_TOKEN_KEY, nextToken);
      localStorage.setItem(PATIENT_USER_KEY, JSON.stringify(nextPatient));
    } else {
      localStorage.removeItem(PATIENT_TOKEN_KEY);
      localStorage.removeItem(PATIENT_USER_KEY);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const storedToken = localStorage.getItem(PATIENT_TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return null;
    }

    try {
      const { data } = await patientMe();
      const next = data?.patient ?? data;
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
    if (localStorage.getItem(PATIENT_TOKEN_KEY)) {
      refreshMe();
    } else {
      setLoading(false);
    }
  }, [refreshMe]);

  const login = async (email, password) => {
    const { data } = await apiLogin({ email, password });
    persist(data.token, data.patient);
    setLoading(false);
    return data.patient;
  };

  const register = async (payload) => {
    const { data } = await apiRegister(payload);
    persist(data.token, data.patient);
    setLoading(false);
    return data.patient;
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
      patient,
      token,
      loading,
      isAuthenticated: Boolean(token && patient?.id),
      login,
      register,
      logout,
      refreshMe,
      setPatient: (next) => persist(token, next),
    }),
    [patient, token, loading, persist, refreshMe]
  );

  return <PatientAuthContext.Provider value={value}>{children}</PatientAuthContext.Provider>;
}

export function usePatientAuth() {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) throw new Error("usePatientAuth must be used within PatientAuthProvider");
  return ctx;
}
