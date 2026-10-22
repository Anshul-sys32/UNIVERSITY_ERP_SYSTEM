import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { employeeRequest, getCurrentUser, logout } from "../api/roleApi";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const role = getCurrentUser()?.role || "EMPLOYEE";
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: "", message: "", audience: "ALL" });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([employeeRequest("/summary"), employeeRequest("/users"), employeeRequest("/feedback"), employeeRequest("/announcements")])
      .then(([summaryData, usersData, feedbackData, announcementsData]) => {
        setSummary(summaryData);
        setUsers(usersData);
        setFeedback(feedbackData);
        setAnnouncements(announcementsData);
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

  const publishAnnouncement = async (event) => {
    event.preventDefault();
    try {
      const result = await employeeRequest("/announcements", {
        method: "POST",
        body: JSON.stringify(announcement),
      });
      setAnnouncements((current) => [{ ...announcement, ANNOUNCEMENT_ID: result.id, IS_ACTIVE: 1, CREATED_AT: new Date().toISOString() }, ...current]);
      setAnnouncement({ title: "", message: "", audience: "ALL" });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const archiveAnnouncement = async (item) => {
    try {
      await employeeRequest(`/announcements/${item.ANNOUNCEMENT_ID}/status`, { method: "PATCH", body: JSON.stringify({ isActive: !item.IS_ACTIVE }) });
      setAnnouncements((current) => current.map((currentItem) => currentItem.ANNOUNCEMENT_ID === item.ANNOUNCEMENT_ID ? { ...currentItem, IS_ACTIVE: item.IS_ACTIVE ? 0 : 1 } : currentItem));
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
            <h1 className="mt-2 text-3xl font-bold">{role === "ADMIN" ? "Administration workspace" : role === "ACCOUNTANT" ? "Accounts workspace" : role === "LIBRARIAN" ? "Library workspace" : "Employee workspace"}</h1>
            <p className="mt-2 text-white/70">{role === "ADMIN" ? "Manage admissions, users, and campus operations." : role === "ACCOUNTANT" ? "Manage student fees, payments, and financial records." : role === "LIBRARIAN" ? "Manage the catalog, circulation, and library members." : "Monitor campus operations and announcements."}</p>
          </div>
          <button className="rounded-xl bg-white/10 px-4 py-3 text-sm hover:bg-white/20" onClick={async () => { await logout(); navigate("/"); }} type="button">Sign out</button>
        </header>
        {error && <p className="mt-6 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => <div className="erp-panel p-5" key={card.label}><p className="text-sm text-white/60">{card.label}</p><p className="mt-3 text-3xl font-bold">{card.value}</p></div>)}
        </div>
        {role === "ADMIN" && <section className="mt-8">
          <h2 className="text-xl font-semibold">Admissions</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/admin/admissions")} type="button">
              <h3 className="text-lg font-semibold">Admissions & student management</h3>
              <p className="mt-2 text-sm text-white/65">Create, update, and maintain student admissions records.</p>
              <span className="mt-5 inline-block text-sm text-yellow-200">Open admissions →</span>
            </button>
          </div>
        </section>}
        {role === "ADMIN" && <section className="mt-8">
          <h2 className="text-xl font-semibold">Reports</h2>
          <div className="mt-4"><button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/admin/reports")} type="button"><h3 className="text-lg font-semibold">Aggregate overview</h3><p className="mt-2 text-sm text-white/65">View university-level enrollment, fees, and operational totals.</p></button></div>
        </section>}
        {role === "ADMIN" && <section className="mt-8">
          <h2 className="text-xl font-semibold">Campus credit</h2>
          <div className="mt-4"><button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/admin/wallet")} type="button"><h3 className="text-lg font-semibold">Wallet policies and rewards</h3><p className="mt-2 text-sm text-white/65">Set budgets and review faculty reward requests.</p><span className="mt-5 inline-block text-sm text-yellow-200">Open wallet administration →</span></button></div>
        </section>}
        {role === "ADMIN" && <section className="mt-8">
          <h2 className="text-xl font-semibold">Hostel and research office</h2>
          <div className="mt-4"><button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/admin/campus")} type="button"><h3 className="text-lg font-semibold">Campus services administration</h3><p className="mt-2 text-sm text-white/65">Review hostel requests, manage rooms, and publish research opportunities.</p></button></div>
        </section>}
        {role === "ADMIN" && <section className="mt-8">
          <h2 className="text-xl font-semibold">Examination cell</h2>
          <div className="mt-4">
            <button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/admin/exams")} type="button">
              <h3 className="text-lg font-semibold">Exam sessions and results</h3>
              <p className="mt-2 text-sm text-white/65">Schedule exams, enter marks, and moderate results before publication.</p>
              <span className="mt-5 inline-block text-sm text-yellow-200">Open exam management →</span>
            </button>
          </div>
        </section>}
        {role === "ADMIN" && <section className="mt-8">
          <h2 className="text-xl font-semibold">Academic setup</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/admin/academics/courses")} type="button">
              <h3 className="text-lg font-semibold">Course management</h3>
              <p className="mt-2 text-sm text-white/65">Create courses, define capacity, and assign faculty.</p>
              <span className="mt-5 inline-block text-sm text-yellow-200">Open course setup →</span>
            </button>
          </div>
        </section>}
        {(role === "ADMIN" || role === "EMPLOYEE") && <section className="mt-8">
          <h2 className="text-xl font-semibold">Placement department</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/employee/placements")} type="button">
              <h3 className="text-lg font-semibold">Placement management</h3>
              <p className="mt-2 text-sm text-white/65">Create employer drives, track applications, and manage selection stages.</p>
              <span className="mt-5 inline-block text-sm text-yellow-200">Open placement desk →</span>
            </button>
          </div>
        </section>}
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Dashboard configuration</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {[["student", "Student dashboard", "Manage student navigation and theme."], ["faculty", "Faculty dashboard", "Configure faculty workspace defaults."], ["staff", "Staff dashboard", "Configure operational staff navigation."]].map(([type, title, description]) => <button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" key={type} onClick={() => navigate(`/dashboard-config/${type}`)} type="button"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-white/65">{description}</p><span className="mt-5 inline-block text-sm text-yellow-200">Open settings →</span></button>)}
          </div>
        </section>
        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <form className="erp-panel p-6" onSubmit={publishAnnouncement}>
            <h2 className="text-xl font-semibold">Publish announcement</h2>
            <div className="mt-4 space-y-3">
              <input className="erp-input" placeholder="Announcement title" value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} required />
              <textarea className="erp-input min-h-28" placeholder="Message for the selected audience" value={announcement.message} onChange={(event) => setAnnouncement({ ...announcement, message: event.target.value })} required />
              <div className="flex flex-wrap gap-3"><select className="erp-input max-w-xs" value={announcement.audience} onChange={(event) => setAnnouncement({ ...announcement, audience: event.target.value })}><option className="text-black">ALL</option><option className="text-black">STUDENT</option><option className="text-black">FACULTY</option><option className="text-black">EMPLOYEE</option></select><button className="erp-button" type="submit">Publish</button></div>
            </div>
          </form>
          <div className="erp-panel p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Announcements</h2><span className="text-sm text-white/60">{announcements.length} total</span></div><div className="mt-4 max-h-72 space-y-3 overflow-y-auto">{announcements.length ? announcements.map((item) => <article className="border-b border-white/15 pb-3 last:border-0" key={item.ANNOUNCEMENT_ID}><div className="flex items-start justify-between gap-3"><div><h3 className="font-medium">{item.TITLE}</h3><p className="text-xs text-white/50">{item.AUDIENCE} · {item.IS_ACTIVE ? "Published" : "Archived"}</p></div><button className="rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20" onClick={() => archiveAnnouncement(item)} type="button">{item.IS_ACTIVE ? "Archive" : "Publish"}</button></div><p className="mt-2 text-sm text-white/70">{item.MESSAGE}</p></article>) : <p className="text-sm text-white/60">No announcements yet.</p>}</div></div>
        </section>
        {(role === "ADMIN" || role === "ACCOUNTANT" || role === "LIBRARIAN") && <section className="mt-8">
          <h2 className="text-xl font-semibold">Operations</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {(role === "ADMIN" || role === "ACCOUNTANT") && <button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/employee/accounting")} type="button">
              <h3 className="text-lg font-semibold">Accounting</h3>
              <p className="mt-2 text-sm text-white/65">Create fee ledger entries and monitor outstanding payments.</p>
            </button>}
            {(role === "ADMIN" || role === "LIBRARIAN") && <button className="erp-panel p-6 text-left transition-colors duration-150 hover:bg-white/20" onClick={() => navigate("/erp/employee/library")} type="button">
              <h3 className="text-lg font-semibold">Library</h3>
              <p className="mt-2 text-sm text-white/65">Manage the catalog, issue books, and process returns.</p>
            </button>}
          </div>
        </section>}
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
