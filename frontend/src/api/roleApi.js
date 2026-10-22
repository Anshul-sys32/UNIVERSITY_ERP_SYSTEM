const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let currentUser = null;
let csrfToken = null;
let csrfTokenRequest = null;

export const getCurrentUser = () => currentUser;

export const setCurrentUser = (user) => {
  currentUser = user;
};

const parseResponse = async (response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: "The server returned an invalid response." };
  }
};

const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfTokenRequest) {
    csrfTokenRequest = fetch(`${API_URL}/csrf-token`, { credentials: "include" })
      .then(async (response) => {
        const data = await parseResponse(response);
        if (!response.ok || !data?.csrfToken) throw new Error("Unable to establish a secure request token.");
        csrfToken = data.csrfToken;
        return csrfToken;
      })
      .finally(() => { csrfTokenRequest = null; });
  }
  return csrfTokenRequest;
};

export const apiRequest = async (path, options = {}, { handleUnauthorized = true } = {}) => {
  const method = (options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  delete headers["x-user-id"];
  delete headers["X-User-Id"];
  if (unsafeMethods.has(method)) headers["X-CSRF-Token"] = await getCsrfToken();

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, method, headers, credentials: "include" });
  } catch (error) {
    throw new Error(error.message || "Unable to reach the server.");
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    if (response.status === 401 && handleUnauthorized) {
      currentUser = null;
      csrfToken = null;
      if (typeof window !== "undefined") window.dispatchEvent(new Event("erp:session-expired"));
    }
    throw new Error(data?.message || "Request failed.");
  }
  return data;
};

export const login = async (username, password) => {
  const data = await apiRequest("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  }, { handleUnauthorized: false });
  csrfToken = data.csrfToken;
  currentUser = { user_id: data.user_id, username: data.username, role: data.role };
  return currentUser;
};

export const loadCurrentUser = async () => {
  try {
    const user = await apiRequest("/me", {}, { handleUnauthorized: false });
    currentUser = user;
    return user;
  } catch (error) {
    currentUser = null;
    csrfToken = null;
    if (error.message === "Authentication is required.") return null;
    throw error;
  }
};

export const logout = async () => {
  try {
    await apiRequest("/logout", { method: "POST" }, { handleUnauthorized: false });
  } finally {
    currentUser = null;
    csrfToken = null;
  }
};

const requireUserId = (message) => {
  if (!currentUser?.user_id) throw new Error(message);
  return currentUser.user_id;
};

export const facultyRequest = (path, options) => {
  const userId = requireUserId("Please sign in with a faculty account first.");
  return apiRequest(`/faculty-data/${userId}${path}`, options);
};

export const employeeRequest = (path, options) => {
  const userId = requireUserId("Please sign in with an employee account first.");
  return apiRequest(`/employee-data/${userId}${path}`, options);
};

export const operationsRequest = (path, options) => {
  const userId = requireUserId("Please sign in with an employee account first.");
  return apiRequest(`/operations-data/${userId}${path}`, options);
};

export const adminRequest = (path, options = {}) => {
  if (!currentUser?.user_id || currentUser.role !== "ADMIN") {
    throw new Error("Please sign in with an administrator account first.");
  }
  return apiRequest(path, options);
};