import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "./themeContext";
import { apiRequest } from "../api/roleApi";

const iconMarks = {
  home: "H",
  profile: "P",
  academics: "A",
  exams: "E",
  finance: "$",
  campus: "C",
  library: "L",
  placements: "J",
  services: "S",
  faculty: "F",
  assignments: "A",
  questions: "Q",
  attendance: "T",
  rewards: "+",
  timetable: "T",
  admissions: "A",
  courses: "C",
  wallet: "W",
  reports: "R",
  hostel: "H",
  research: "R",
  users: "U",
  notifications: "N",
  settings: "S",
  operations: "O",
};

const SidebarIcon = ({ name }) => (
  <span aria-hidden="true" className="sidebar-icon">{iconMarks[name] || "•"}</span>
);

export const SidebarToggle = ({ onClick, expanded, className = "" }) => (
  <button
    aria-label={expanded ? "Close navigation" : "Open navigation"}
    aria-expanded={expanded}
    className={`sidebar-toggle ${className}`}
    onClick={onClick}
    title={expanded ? "Close navigation" : "Open navigation"}
    type="button"
  >
    <span aria-hidden="true">{expanded ? "×" : "☰"}</span>
  </button>
);

const AnimatedSidebar = ({
  title,
  subtitle,
  groups,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onLogout,
}) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [visibleModules, setVisibleModules] = useState(null);
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(groups.map((group) => [group.label, true])));

  useEffect(() => {
    let active = true;
    apiRequest("/me/navigation")
      .then((navigation) => { if (active) setVisibleModules(navigation.modules); })
      .catch(() => { if (active) setVisibleModules(null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    onCloseMobile();
  }, [location.pathname, onCloseMobile]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <button
        aria-label="Close navigation overlay"
        className={`sidebar-backdrop ${mobileOpen ? "is-visible" : ""}`}
        onClick={onCloseMobile}
        tabIndex={mobileOpen ? 0 : -1}
        type="button"
      />
      <aside className={`app-sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-copy">
            <p className="sidebar-eyebrow">University ERP</p>
            <h1>{title}</h1>
            {subtitle && <p className="sidebar-subtitle">{subtitle}</p>}
          </div>
          <SidebarToggle className="sidebar-collapse-button" expanded={!collapsed} onClick={onToggleCollapse} />
          <SidebarToggle className="sidebar-mobile-close" expanded onClick={onCloseMobile} />
        </div>

        <nav aria-label={`${title} navigation`} className="sidebar-navigation">
          {groups.map((group) => ({ ...group, items: group.items.filter((item) => !item.module || !visibleModules || visibleModules.includes(item.module)) }))
            .filter((group) => group.items.length > 0).map((group) => (
            <section className="sidebar-group" key={group.label}>
              {!collapsed && group.label && (
                <button
                  aria-expanded={Boolean(openGroups[group.label])}
                  className="sidebar-group-heading"
                  onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !current[group.label] }))}
                  type="button"
                >
                  <span>{group.label}</span><span aria-hidden="true">{openGroups[group.label] ? "−" : "+"}</span>
                </button>
              )}
              <div className={`sidebar-group-items ${!collapsed && group.label && !openGroups[group.label] ? "is-group-closed" : ""}`}>
                {group.items.map((item) => (
                  <NavLink
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                    end={item.end}
                    key={item.path}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    to={item.path}
                  >
                    <SidebarIcon name={item.icon} />
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-theme-control">
            {!collapsed && <p className="sidebar-theme-label">Appearance</p>}
            <div aria-label="Color theme" className="sidebar-theme-options" role="group">
              {[
                ["original", "O", "Default colors"],
                ["light", "L", "Light theme"],
                ["dark", "D", "Dark theme"],
              ].map(([value, mark, label]) => (
                <button
                  aria-label={label}
                  aria-pressed={theme === value}
                  className={`sidebar-theme-option ${theme === value ? "is-selected" : ""}`}
                  key={value}
                  onClick={() => setTheme(value)}
                  title={collapsed ? label : undefined}
                  type="button"
                >
                  <span aria-hidden="true">{collapsed ? mark : label}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="sidebar-link sidebar-logout" onClick={onLogout} type="button" title={collapsed ? "Sign out" : undefined}>
            <SidebarIcon name="settings" /><span className="sidebar-link-label">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AnimatedSidebar;