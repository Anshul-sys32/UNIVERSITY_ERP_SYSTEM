import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { employeeRequest } from "../api/roleApi";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([employeeRequest("/summary"), employeeRequest("/users"), employeeRequest("/feedback")])
      .then(([summaryData, usersData, feedbackData]) => {
        setSummary(summaryData);
        setUsers(usersData);
        setFeedback(feedbackData);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const updateUserStatus = async (user) => {
    try {
      await employeeRequest(`/users/${user.USER_ID}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.IS_ACTIVE }),
      });
      setUsers((current) => current.map((item) => item.USER_ID === user.USER_ID
        ? { ...item, IS_ACTIVE: user.IS_ACTIVE ? 0 : 1 }
        : item));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateFeedbackStatus = async (item, status) => {
    try {
      await employeeRequest(`/feedback/${item.FEEDBACK_ID}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setFeedback((current) => current.map((feedbackItem) => feedbackItem.FEEDBACK_ID === item.FEEDBACK_ID
        ? { ...feedbackItem, STATUS: status }
        : feedbackItem));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const cards = [
    { label: "Active users", value: summary?.users || 0 },
    { label: "Active students", value: summary?.students || 0 },
    { label: "Active faculty", value: summary?.faculty || 0 },
    { label: "Open feedback", value: summary?.openFeedback || 0 },
  ];

  return (
    <main className="min-h-screen p-5 text-white sm:p-8 erp-gradient">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">University ERP</p>
            <h1 className="mt-2 text-3xl font-bold">Employee workspace</h1>
            <p className="mt-2 text-white/70">Monitor campus operations and configure role dashboards.</p>
          </div>
          <button className="rounded-xl bg-white/10 px-4 py-3 text-sm hover:bg-white/20" onClick={() => { sessionStorage.removeItem("erpUser"); navigate("/"); }} type="button">Sign out</button>
        </header>
        {error && <p className="mt-6 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => <div className="erp-panel p-5" key={card.label}><p className="text-sm text-white/60">{card.label}</p><p className="mt-3 text-3xl font-bold">{card.value}</p></div>)}
        </div>
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Dashboard configuration</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {[["student", "Student dashboard", "Manage student navigation and theme."], ["faculty", "Faculty dashboard", "Configure faculty workspace defaults."], ["staff", "Staff dashboard", "Configure operational staff navigation."]].map(([type, title, description]) => <button className="erp-panel p-6 text-left transition hover:-translate-y-1 hover:bg-white/20" key={type} onClick={() => navigate(`/dashboard-config/${type}`)} type="button"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/65">{description}</p><span className="mt-5 inline-block text-sm text-yellow-200">Open settings →</span></button>)}
          </div>
        </section>
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="erp-panel p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">User accounts</h2><span className="text-sm text-white/60">{users.length} total</span></div>
            <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
              {users.length ? users.map((user) => <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3 text-sm last:border-0" key={user.USER_ID}><div><p className="font-medium">{user.USERNAME}</p><p className="text-xs text-white/60">{user.ROLE}</p></div><button className="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20" onClick={() => updateUserStatus(user)} type="button">{user.IS_ACTIVE ? "Deactivate" : "Activate"}</button></div>) : <p className="text-sm text-white/60">No users found.</p>}
            </div>
          </div>
          <div className="erp-panel p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Student feedback</h2><span className="text-sm text-white/60">{feedback.length} total</span></div>
            <div className="mt-5 max-h-80 space-y-4 overflow-y-auto">
              {feedback.length ? feedback.map((item) => <div className="border-b border-white/15 pb-4 last:border-0" key={item.FEEDBACK_ID}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.SUBJECT}</p><p className="text-xs text-white/60">{item.FIRST_NAME} {item.LAST_NAME || ""} · {item.ROLL_NUMBER || "No roll number"}</p></div><select className="rounded-lg bg-white px-2 py-1 text-xs text-slate-900" value={item.STATUS} onChange={(event) => updateFeedbackStatus(item, event.target.value)}><option value="OPEN">Open</option><option value="IN_REVIEW">In review</option><option value="RESOLVED">Resolved</option></select></div><p className="mt-2 text-sm leading-6 text-white/70">{item.MESSAGE}</p></div>) : <p className="text-sm text-white/60">No feedback found.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default EmployeeDashboard;
