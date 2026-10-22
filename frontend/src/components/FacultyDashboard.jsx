import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { facultyRequest } from "../api/roleApi";
import { logout } from "../api/roleApi";

const FacultyDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    facultyRequest("/dashboard").then(setDashboard).catch((requestError) => setError(requestError.message));
  }, []);

  const isHome = location.pathname === "/erp/faculty";
  const faculty = dashboard?.faculty;
  const navItems = [
    ["Dashboard", "/erp/faculty"],
    ["Assignments", "/erp/faculty/assignments"],
    ["Question bank", "/erp/faculty/question-bank"],
    ["Attendance", "/erp/faculty/attendance"],
    ["Timetable", "/erp/faculty/timetable"],
    ["Form generator", "/erp/faculty/form-generator"],
  ];

  return (
    <div className="min-h-screen text-white erp-gradient">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="w-full border-b border-white/20 bg-black/10 p-5 md:w-72 md:border-b-0 md:border-r md:p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">University ERP</p>
          <h1 className="mt-2 text-2xl font-bold">Faculty portal</h1>
          <nav className="mt-8 grid grid-cols-2 gap-2 md:block md:space-y-1">
            {navItems.map(([label, path]) => <NavLink className={({ isActive }) => `block rounded-xl px-4 py-3 text-sm transition ${isActive ? "bg-white font-semibold text-slate-900" : "text-white/75 hover:bg-white/15 hover:text-white"}`} end={path === "/erp/faculty"} key={path} to={path}>{label}</NavLink>)}
          </nav>
          <button className="mt-6 rounded-xl px-4 py-3 text-sm text-white/75 hover:bg-white/15 hover:text-white" onClick={async () => { await logout(); navigate("/"); }} type="button">Sign out</button>
        </aside>
        <main className="min-w-0 flex-1 p-5 sm:p-8">
          <header className="mb-8"><p className="text-sm text-white/60">Faculty workspace</p><h2 className="mt-1 text-3xl font-bold">{faculty ? `Welcome, ${faculty.FIRST_NAME}` : "Welcome, Faculty"}</h2></header>
          {error && <p className="mb-5 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
          {isHome ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="erp-panel p-6"><p className="text-sm text-white/60">Published assignments</p><p className="mt-3 text-4xl font-bold">{dashboard?.assignments?.TOTAL || 0}</p></div><div className="erp-panel p-6"><p className="text-sm text-white/60">Pending assignments</p><p className="mt-3 text-4xl font-bold">{dashboard?.assignments?.PENDING || 0}</p></div><div className="erp-panel p-6"><p className="text-sm text-white/60">Question bank items</p><p className="mt-3 text-4xl font-bold">{dashboard?.questions?.TOTAL || 0}</p></div><div className="erp-panel p-6 sm:col-span-2 lg:col-span-3"><h3 className="text-lg font-semibold">Teaching overview</h3><p className="mt-2 text-sm text-white/70">{faculty?.DEPARTMENT || "Department not configured"} · {faculty?.DESIGNATION || "Faculty member"}</p><p className="mt-4 text-sm text-white/70">Use the navigation to publish assignments, maintain your question bank, and build assessment forms.</p></div></div> : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default FacultyDashboard;
