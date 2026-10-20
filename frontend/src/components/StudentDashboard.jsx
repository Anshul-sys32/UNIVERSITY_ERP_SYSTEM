import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { dashboardSettings } from "../config/dashboardConfig";
import { fetchStudentResource } from "../api/studentApi";
import BellIcon from "../assets/icons/bell.png";
import UserIcon from "../assets/icons/profile.png";
import ExitIcon from "../assets/icons/logout.png";
import StudentDataState from "./StudentDataState";

const Card = ({ title, children }) => (
  <div className="erp-panel p-5 text-white">
    <h2 className="mb-4 text-lg font-semibold">{title}</h2>
    {children}
  </div>
);

const CircularProgress = ({ value }) => {
  const percentage = Math.min(Math.max(Number(value || 0), 0), 100);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative mx-auto h-28 w-28">
      <svg className="rotate-90" width="100%" height="100%" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth="4" fill="transparent" />
        <circle cx="24" cy="24" r={radius} stroke="white" strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={circumference - (percentage / 100) * circumference} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-bold">{percentage.toFixed(0)}%</span>
    </div>
  );
};

const StudentDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });
  const settings = dashboardSettings.student;

  useEffect(() => {
    fetchStudentResource("dashboard")
      .then(setDashboard)
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  const isDashboard = location.pathname === "/erp/student";
  const student = dashboard?.student;
  const attendance = dashboard?.attendance || { TODAY_PERCENT: 0, OVERALL_PERCENT: 0 };
  const assignments = dashboard?.assignments || [];
  const results = dashboard?.results || [];

  return (
    <div className="min-h-screen text-white" style={{ background: settings.background }}>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="w-full border-b border-white/20 bg-black/10 p-5 md:w-72 md:border-b-0 md:border-r md:p-6">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">University ERP</p>
            <h1 className="mt-2 text-2xl font-bold">Student portal</h1>
          </div>
          <nav className="grid grid-cols-2 gap-2 md:block md:space-y-1">
            {settings.sidebarItems.map((item) => (
              <NavLink
                className={({ isActive }) => `block rounded-xl px-4 py-3 text-sm transition ${isActive ? "bg-white text-slate-900 font-semibold" : "text-white/75 hover:bg-white/15 hover:text-white"}`}
                end={item.path === "/erp/student"}
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/75 hover:bg-white/15 hover:text-white" onClick={() => { sessionStorage.removeItem("erpUser"); navigate("/"); }} type="button">
            <img src={ExitIcon} alt="" className="h-6 w-6" /> Sign out
          </button>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Student workspace</p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{student ? `Welcome, ${student.FIRST_NAME}` : "Welcome back"}</h2>
            </div>
            <div className="flex gap-3">
              <button className="rounded-xl bg-white/10 p-3 hover:bg-white/20" title="Notifications" type="button"><img src={BellIcon} alt="Notifications" className="h-7 w-7" /></button>
              <button className="rounded-xl bg-white/10 p-3 hover:bg-white/20" title="Profile" type="button"><img src={UserIcon} alt="Profile" className="h-7 w-7" /></button>
            </div>
          </header>

          {isDashboard ? (
            <StudentDataState {...state} empty={!dashboard}>
              <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <Card title="Roll number"><p className="text-2xl font-bold">{student?.ROLL_NUMBER || "—"}</p></Card>
                <Card title="Semester"><p className="text-2xl font-bold">{student?.CURRENT_SEMESTER || "—"}</p></Card>
                <Card title="Batch year"><p className="text-2xl font-bold">{student?.BATCH_YEAR || "—"}</p></Card>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Attendance today"><CircularProgress value={attendance.TODAY_PERCENT} /></Card>
                <Card title="Overall attendance"><CircularProgress value={attendance.OVERALL_PERCENT} /></Card>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Card title="Upcoming assignments">
                  {assignments.length ? <div className="space-y-3">{assignments.map((assignment) => <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-3 text-sm last:border-0 last:pb-0" key={assignment.ASSIGNMENT_ID}><span>{assignment.TITLE}</span><span className="text-white/60">{assignment.STATUS}</span></div>)}</div> : <p className="text-sm text-white/60">No upcoming assignments.</p>}
                </Card>
                <Card title="Latest results">
                  {results.length ? <div className="space-y-3">{results.map((result) => <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-3 text-sm last:border-0 last:pb-0" key={`${result.SUBJECT}-${result.SCORE}`}><span>{result.SUBJECT}</span><span className="font-semibold">{result.SCORE}/{result.MAX_SCORE}</span></div>)}</div> : <p className="text-sm text-white/60">No results published.</p>}
                </Card>
              </div>
            </StudentDataState>
          ) : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
