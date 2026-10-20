const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getCurrentUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("erpUser") || "null");
  } catch {
    return null;
  }
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
};

export const facultyRequest = (path, options) => {
  const user = getCurrentUser();
  if (!user?.user_id) throw new Error("Please sign in with a faculty account first.");
  return request(`/faculty-data/${user.user_id}${path}`, options);
};

export const employeeRequest = (path, options) => {
  const user = getCurrentUser();
  if (!user?.user_id) throw new Error("Please sign in with an employee account first.");
  return request(`/employee-data/${user.user_id}${path}`, options);
};

export const operationsRequest = (path, options) => {
  const user = getCurrentUser();
  if (!user?.user_id) throw new Error("Please sign in with an employee account first.");
  return request(`/operations-data/${user.user_id}${path}`, options);
};

export const adminRequest = (path, options = {}) => {
  const user = getCurrentUser();
  if (!user?.user_id || user.role !== "ADMIN") {
    throw new Error("Please sign in with an administrator account first.");
  }
  return request(path, {
    ...options,
    headers: { ...(options.headers || {}), "x-user-id": String(user.user_id) },
  });
};
