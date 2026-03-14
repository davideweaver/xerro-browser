const TOKEN_KEY = "xerro_token";
const EXPIRES_KEY = "xerro_token_expires";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getExpiry(): string | null {
  return localStorage.getItem(EXPIRES_KEY);
}

export function setToken(token: string, expiresAt: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRES_KEY, expiresAt);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

export function isTokenValid(): boolean {
  const token = getToken();
  const expiry = getExpiry();
  if (!token || !expiry) return false;
  return new Date(expiry) > new Date();
}
