import { useCallback, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../../api/roleApi";
import AnimatedSidebar, { SidebarToggle } from "../../components/AnimatedSidebar";

const EmployeePortalLayout = () => {
  const role = getCurrentUser()?.role || "EMPLOYEE";
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((current) => !current), []);
  const groups = [
    { label: "Workspace", items: [{ label: "Dashboard", path: "/erp/employee", icon: "home", end: true, module: "employee_data" }] },
    { label: "Operations", items: [
      { label: "Accounting", path: "/erp/employee/accounting", icon: "finance", module: "operations_accounting" },
      { label: "Library", path: "/erp/employee/library", icon: "library", module: "operations_library" },
      { label: "Placements", path: "/erp/employee/placements", icon: "placements", module: "operations_placements" },
    ] },
    { label: "Settings", items: [{ label: "Dashboard settings", path: "/erp/employee/dashboard-config/staff", icon: "settings", module: "dashboard_configuration" }] },
  ];
  const signOut = async () => { await logout(); navigate("/"); };

  return (
    <div className="sidebar-layout min-h-screen text-white erp-gradient">
      <AnimatedSidebar
        title={`${role[0]}${role.slice(1).toLowerCase()} portal`}
        subtitle="University operations"
        groups={groups}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleCollapsed}
        onCloseMobile={closeMobile}
        onLogout={signOut}
      />
      <main className="sidebar-layout-main min-w-0">
        <div className="flex min-h-14 items-center gap-3 border-b border-white/10 px-4 md:hidden">
          <SidebarToggle className="sidebar-toggle-mobile" expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} />
          <span className="text-sm text-white/70">{role} workspace</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default EmployeePortalLayout;