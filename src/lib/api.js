const ACCESS_TOKEN_KEY = "exora_access_token";
const REFRESH_TOKEN_KEY = "exora_refresh_token";
let refreshPromise = null;

export const apiBase = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://vextra-ai-crm-api.onrender.com" : "http://127.0.0.1:8000");
export const isApiConfigured = true;

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthTokens({ access_token, refresh_token }) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
}

export function clearAuthTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function refreshAccessToken(refreshToken) {
  if (!refreshPromise) {
    refreshPromise = request(
      "/api/auth/refresh",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
      null,
    )
      .then((tokens) => {
        setAuthTokens(tokens);
        return tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request(path, options = {}, token = getAccessToken()) {
  const headers = {
    ...(options.headers || {}),
  };
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !headers["Content-Type"] && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail;
    const message = typeof detail === "string" ? detail : detail?.message || body.error || "API request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = body.detail || body;
    throw error;
  }
  return body;
}

export async function apiFetch(path, options = {}) {
  try {
    return await request(path, options);
  } catch (error) {
    const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (error.status !== 401 || !refreshToken || path === "/api/auth/refresh" || path === "/api/auth/login") {
      throw error;
    }
    try {
      const tokens = await refreshAccessToken(refreshToken);
      return await request(path, options, tokens.access_token);
    } catch (refreshError) {
      clearAuthTokens();
      throw refreshError;
    }
  }
}
