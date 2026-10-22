import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { facultyRequest, logout } from "../api/roleApi";
import AnimatedSidebar, { SidebarToggle } from "./AnimatedSidebar";

const FacultyDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarMobileOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((current) => !current), []);
  const signOut = async () => { await logout(); navigate("/"); };

  useEffect(() => {
    facultyRequest("/dashboard").then(setDashboard).catch((requestError) => setError(requestError.message));
  }, []);

  const isHome = location.pathname === "/erp/faculty";
  const faculty = dashboard?.faculty;
  const sidebarGroups = [
    { label: "Workspace", items: [{ label: "Dashboard", path: "/erp/faculty", icon: "home", end: true }] },
    { label: "Teaching", items: [
      { label: "Timetable", path: "/erp/faculty/timetable", icon: "timetable" },
      { label: "Attendance", path: "/erp/faculty/attendance", icon: "attendance" },
      { label: "Assignments", path: "/erp/faculty/assignments", icon: "assignments" },
      { label: "Question bank", path: "/erp/faculty/question-bank", icon: "questions" },
      { label: "Form generator", path: "/erp/faculty/form-generator", icon: "academics" },
    ] },
    { label: "Student support", items: [{ label: "Reward requests", path: "/erp/faculty/rewards", icon: "rewards" }] },
  ];

  return (
    <div className="min-h-screen text-white erp-gradient">
      <div className="sidebar-layout mx-auto max-w-[1600px]">
        <AnimatedSidebar title="Faculty portal" subtitle="Teaching workspace" groups={sidebarGroups} collapsed={sidebarCollapsed} mobileOpen={sidebarMobileOpen} onToggleCollapse={toggleSidebar} onCloseMobile={closeSidebar} onLogout={signOut} />
        <main className="sidebar-layout-main min-w-0 p-5 sm:p-8">
          <header className="mb-8"><div className="flex items-center gap-3"><SidebarToggle className="sidebar-toggle-mobile" expanded={sidebarMobileOpen} onClick={() => setSidebarMobileOpen((current) => !current)} /><p className="text-sm text-white/60">Faculty workspace</p></div><h2 className="mt-1 text-3xl font-bold">{faculty ? `Welcome, ${faculty.FIRST_NAME}` : "Welcome, Faculty"}</h2></header>
          {error && <p className="mb-5 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
          {isHome ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="erp-panel p-6"><p className="text-sm text-white/60">Published assignments</p><p className="mt-3 text-4xl font-bold">{dashboard?.assignments?.TOTAL || 0}</p></div><div className="erp-panel p-6"><p className="text-sm text-white/60">Pending assignments</p><p className="mt-3 text-4xl font-bold">{dashboard?.assignments?.PENDING || 0}</p></div><div className="erp-panel p-6"><p className="text-sm text-white/60">Question bank items</p><p className="mt-3 text-4xl font-bold">{dashboard?.questions?.TOTAL || 0}</p></div><div className="erp-panel p-6 sm:col-span-2 lg:col-span-3"><h3 className="text-lg font-semibold">Teaching overview</h3><p className="mt-2 text-sm text-white/70">{faculty?.DEPARTMENT || "Department not configured"} · {faculty?.DESIGNATION || "Faculty member"}</p><p className="mt-4 text-sm text-white/70">Use the navigation to publish assignments, maintain your question bank, and build assessment forms.</p></div></div> : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default FacultyDashboard;
