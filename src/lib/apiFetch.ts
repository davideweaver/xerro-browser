import { clearToken, getToken } from "./authStorage";

export function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers }).then((response) => {
    if (response.status === 401) {
      clearToken();
      window.dispatchEvent(new Event("xerro-unauthorized"));
    }
    return response;
  });
}
