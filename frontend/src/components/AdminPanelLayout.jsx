import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { logout } from "../api/roleApi";
import AnimatedSidebar, { SidebarToggle } from "./AnimatedSidebar";

const adminGroups = [
  { label: "Overview", items: [{ label: "Administration dashboard", path: "/erp/admin", icon: "home", end: true }] },
  { label: "Admissions", items: [
    { label: "Admission records", path: "/erp/admin/admissions", icon: "admissions" },
    { label: "Student management", path: "/erp/admin/students", icon: "profile" },
  ] },
  { label: "Academics", items: [
    { label: "Course management", path: "/erp/admin/academics/courses", icon: "courses" },
    { label: "Exams & results", path: "/erp/admin/exams", icon: "exams" },
  ] },
  { label: "Finance & operations", items: [
    { label: "Accounting", path: "/erp/admin/accounting", icon: "finance" },
    { label: "Library", path: "/erp/admin/library", icon: "library" },
    { label: "Placements", path: "/erp/admin/placements", icon: "placements" },
  ] },
  { label: "Campus services", items: [
    { label: "Hostel & research", path: "/erp/admin/campus", icon: "hostel" },
    { label: "Campus credit wallet", path: "/erp/admin/wallet", icon: "wallet" },
  ] },
  { label: "Insights & system", items: [
    { label: "Reports", path: "/erp/admin/reports", icon: "reports" },
    { label: "Notifications", path: "/erp/notifications", icon: "notifications" },
    { label: "Student dashboard settings", path: "/erp/admin/dashboard-config/student", icon: "settings" },
    { label: "Faculty dashboard settings", path: "/erp/admin/dashboard-config/faculty", icon: "settings" },
    { label: "Staff dashboard settings", path: "/erp/admin/dashboard-config/staff", icon: "settings" },
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