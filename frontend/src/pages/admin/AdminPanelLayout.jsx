import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { logout } from "../../api/roleApi";
import AnimatedSidebar, { SidebarToggle } from "../../components/AnimatedSidebar";

const adminGroups = [
  { label: "Overview", items: [{ label: "Administration dashboard", path: "/erp/admin", icon: "home", end: true, module: "admin_home" }] },
  { label: "Admissions", items: [
    { label: "Admission records", path: "/erp/admin/admissions", icon: "admissions", module: "students" },
  ] },
  { label: "Academics", items: [
    { label: "Course management", path: "/erp/admin/academics/courses", icon: "courses", module: "academic_data" },
    { label: "Timetable management", path: "/erp/admin/timetables", icon: "timetable", module: "academic_data" },
    { label: "Exams & results", path: "/erp/admin/exams", icon: "exams", module: "exam_admin" },
  ] },
  { label: "Finance & operations", items: [
    { label: "Accounting", path: "/erp/admin/accounting", icon: "finance", module: "operations_accounting" },
    { label: "Library", path: "/erp/admin/library", icon: "library", module: "operations_library" },
    { label: "Placements", path: "/erp/admin/placements", icon: "placements", module: "operations_placements" },
  ] },
  { label: "Campus services", items: [
    { label: "Hostel management", path: "/erp/admin/hostel", icon: "hostel", module: "campus_admin_hostel" },
    { label: "Research & development", path: "/erp/admin/research", icon: "research", module: "campus_admin_research" },
    { label: "Campus credit wallet", path: "/erp/admin/wallet", icon: "wallet", module: "wallet_admin" },
  ] },
  { label: "Insights & system", items: [
    { label: "Reports", path: "/erp/admin/reports", icon: "reports", module: "reports" },
      { label: "Database records", path: "/erp/admin/data", icon: "operations", module: "admin_home" },
    { label: "Notifications", path: "/erp/notifications", icon: "notifications", module: "notifications" },
    { label: "Access control", path: "/erp/admin/access", icon: "users", module: "access_admin" },
    { label: "Student dashboard settings", path: "/erp/admin/dashboard-config/student", icon: "settings", module: "dashboard_configuration" },
    { label: "Faculty dashboard settings", path: "/erp/admin/dashboard-config/faculty", icon: "settings", module: "dashboard_configuration" },
    { label: "Staff dashboard settings", path: "/erp/admin/dashboard-config/staff", icon: "settings", module: "dashboard_configuration" },
  ] },
];

const AdminPanelLayout = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((current) => !current), []);
  const signOut = async () => { await logout(); navigate("/"); };

  return (
    <div className="sidebar-layout min-h-screen text-white erp-gradient">
      <AnimatedSidebar
        title="Admin console"
        subtitle="University operations"
        groups={adminGroups}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleCollapsed}
        onCloseMobile={closeMobile}
        onLogout={signOut}
      />
      <main className="sidebar-layout-main min-w-0">
        <div className="flex min-h-14 items-center gap-3 border-b border-white/10 px-4 md:hidden">
          <SidebarToggle className="sidebar-toggle-mobile" expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} />
          <span className="text-sm text-white/70">Admin console</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminPanelLayout;