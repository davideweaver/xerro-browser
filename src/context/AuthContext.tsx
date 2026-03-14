import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearToken, isTokenValid, setToken } from "@/lib/authStorage";

const API_URL =
  import.meta.env.VITE_XERRO_API_URL ||
  import.meta.env.VITE_XERRO_SERVICE_URL ||
  "http://localhost:9205";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isTokenValid());

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
  }, []);

  const login = useCallback(async (password: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("rate_limited");
      }
      throw new Error("invalid_password");
    }

    const data: { token: string; expiresAt: string } = await response.json();
    setToken(data.token, data.expiresAt);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("xerro-unauthorized", handler);
    return () => window.removeEventListener("xerro-unauthorized", handler);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
