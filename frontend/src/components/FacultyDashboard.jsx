import React from "react";
import { Link, Outlet } from "react-router-dom";

const FacultyDashboard = () => {
  return (
    <div
      className="min-h-screen flex text-white"
      style={{
        background: "linear-gradient(300deg, rgba(67, 10, 199, 0.96), rgba(255, 35, 15, 0.95))",
      }}
    >
      {/* Sidebar */}
      <aside className="w-64 bg-white/10 backdrop-blur-lg p-6 border-r border-white/20">
        <h2 className="text-2xl font-bold mb-6">Faculty Panel</h2>
        <ul className="space-y-4 text-sm font-medium">
          <li>
            <Link to="/faculty/form-generator" className="hover:text-yellow-300">Form Generator</Link>
          </li>
          <li>
            <Link to="/faculty/assignments" className="hover:text-yellow-300">Assignments</Link>
          </li>
          <li>
            <Link to="/faculty/question-bank" className="hover:text-yellow-300">Question Bank</Link>
          </li>
          <li>
            <Link to="/faculty/manage-students" className="hover:text-yellow-300">Manage Students</Link>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <h1 className="text-3xl font-semibold mb-4">Welcome, Faculty!</h1>
        <Outlet />
      </main>
    </div>
  );
};

export default FacultyDashboard;
