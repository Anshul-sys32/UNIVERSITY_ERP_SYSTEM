import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { dashboardSettings } from "../config/dashboardConfig";
import { fetchStudentResource } from "../api/studentApi";
import { logout } from "../api/roleApi";
import AnimatedSidebar, { SidebarToggle } from "./AnimatedSidebar";
import BellIcon from "../assets/icons/bell.png";
import UserIcon from "../assets/icons/profile.png";
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
  const [announcements, setAnnouncements] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const settings = dashboardSettings.student;
  const closeSidebar = useCallback(() => setSidebarMobileOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((current) => !current), []);
  const signOut = async () => { await logout(); navigate("/"); };
  const sidebarGroups = [
    { label: "Overview", items: [
      { path: "/erp/student", label: "Dashboard", icon: "home", end: true },
      { path: "/erp/student/profile", label: "My Profile", icon: "profile" },
    ] },
    { label: "Learning", items: [
      { path: "/erp/student/academics", label: "Academics", icon: "academics" },
      { path: "/erp/student/assignments", label: "Assignments", icon: "assignments" },
      { path: "/erp/student/exams", label: "Examinations", icon: "exams" },
      { path: "/erp/student/question-bank", label: "Question Bank", icon: "questions" },
      { path: "/erp/student/results", label: "Results", icon: "exams" },
    ] },
    { label: "Campus", items: [
      { path: "/erp/student/fees", label: "Fees", icon: "finance" },
      { path: "/erp/student/wallet", label: "Campus Wallet", icon: "wallet" },
      { path: "/erp/student/library", label: "Library", icon: "library" },
      { path: "/erp/student/events", label: "Events & Placements", icon: "placements" },
      { path: "/erp/student/campus-services", label: "Hostel & Research", icon: "campus" },
      { path: "/erp/student/feedback", label: "Help & Feedback", icon: "services" },
    ] },
  ];

  useEffect(() => {
    Promise.all([fetchStudentResource("dashboard"), fetchStudentResource("announcements")])
      .then(([dashboardData, announcementsData]) => {
        setDashboard(dashboardData);
        setAnnouncements(announcementsData);
      })
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  const isDashboard = location.pathname === "/erp/student";
  const student = dashboard?.student;
  const attendance = dashboard?.attendance || { TODAY_PERCENT: 0, OVERALL_PERCENT: 0 };
  const assignments = dashboard?.assignments || [];
  const results = dashboard?.results || [];

  return (
    <div className="student-shell min-h-screen text-white" style={{ background: settings.background }}>
      <div className="sidebar-layout mx-auto max-w-[1600px]">
        <AnimatedSidebar title="Student portal" subtitle="Your learning workspace" groups={sidebarGroups} collapsed={sidebarCollapsed} mobileOpen={sidebarMobileOpen} onToggleCollapse={toggleSidebar} onCloseMobile={closeSidebar} onLogout={signOut} />
        <main className="sidebar-layout-main min-w-0 p-4 sm:p-6 lg:p-8">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3"><SidebarToggle className="sidebar-toggle-mobile" expanded={sidebarMobileOpen} onClick={() => setSidebarMobileOpen((current) => !current)} /><p className="text-sm text-white/60">Student workspace</p></div>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{student ? `Welcome, ${student.FIRST_NAME}` : "Welcome back"}</h2>
            </div>
            <div className="flex gap-3">
              <button className="rounded-xl bg-white/10 p-3 hover:bg-white/20" title="Notifications" onClick={() => navigate("/erp/notifications")} type="button"><img src={BellIcon} alt="Notifications" className="h-7 w-7" /></button>
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
              <Card title="Campus announcements">
                {announcements.length ? <div className="space-y-3">{announcements.slice(0, 5).map((item) => <article className="border-b border-white/15 pb-3 last:border-0 last:pb-0" key={item.ANNOUNCEMENT_ID}><div className="flex items-start justify-between gap-3"><h3 className="font-medium">{item.TITLE}</h3><time className="whitespace-nowrap text-xs text-white/50">{new Date(item.CREATED_AT).toLocaleDateString("en-IN")}</time></div><p className="mt-1 text-sm leading-6 text-white/70">{item.MESSAGE}</p></article>)}</div> : <p className="text-sm text-white/60">No new announcements.</p>}
              </Card>
            </StudentDataState>
          ) : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
