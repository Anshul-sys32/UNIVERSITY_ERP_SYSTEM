const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getStudentUserId = () => {
  try {
    const user = JSON.parse(sessionStorage.getItem("erpUser") || "null");
    return user?.user_id || null;
  } catch {
    return null;
  }
};

export const fetchStudentResource = async (resource) => {
  const userId = getStudentUserId();
  if (!userId) throw new Error("Please sign in with a student account first.");
  const response = await fetch(`${API_URL}/student-data/${userId}/${resource}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Unable to load student data.");
  return data;
};

export const submitStudentFeedback = async (payload) => {
  const userId = getStudentUserId();
  if (!userId) throw new Error("Please sign in with a student account first.");
  const response = await fetch(`${API_URL}/student-data/${userId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Unable to submit feedback.");
  return data;
};

export const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
  : "—";

export const formatMoney = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(value || 0));
