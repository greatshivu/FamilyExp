import React, { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiError } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function login(email, password) {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  }

  async function refreshUser() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  }

  async function register(name, email, password, phone) {
    try {
      const { data } = await api.post("/auth/register", { name, email, password, phone });
      return { ok: true, message: data?.message || "Account created. Awaiting admin approval." };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(false);
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
