import { apiRequest, getCurrentUser } from "./roleApi";

export const getStudentUserId = () => {
  const user = getCurrentUser();
  return user?.role === "STUDENT" ? user.user_id : null;
};

export const fetchStudentResource = (resource) => {
  const userId = getStudentUserId();
  if (!userId) throw new Error("Please sign in with a student account first.");
  return apiRequest(`/student-data/${userId}/${resource}`);
};

export const submitStudentFeedback = (payload) => {
  const userId = getStudentUserId();
  if (!userId) throw new Error("Please sign in with a student account first.");
  return apiRequest(`/student-data/${userId}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const submitStudentFeePayment = (fee) => {
  const userId = getStudentUserId();
  if (!userId) throw new Error("Please sign in with a student account first.");
  const idempotencyKey = `fee-${crypto.randomUUID()}`;
  return apiRequest(`/student-data/${userId}/fees/${fee.FEE_SOURCE}/${fee.FEE_ID}/pay`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({}),
  });
};

export const formatDate = (value) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
  : "—";

export const formatMoney = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(value || 0));