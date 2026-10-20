import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-5">
      <h2 className="text-xl font-bold mb-5">Student ERP</h2>
      <ul>
        <li className="mb-3">
          <NavLink to="/erp/student" end>Dashboard</NavLink>
        </li>
        <li className="mb-3">
          <NavLink to="/erp/student/assignments">Assignments</NavLink>
        </li>
        <li className="mb-3">
          <NavLink to="/erp/student/fees">Fee Details</NavLink>
        </li>
        <li className="mb-3">
          <NavLink to="/erp/student/library">Library Details</NavLink>
        </li>
        <li className="mb-3">
          <NavLink to="/erp/student/events">Events / Placement</NavLink>
        </li>
        <li className="mb-3">
          <NavLink to="/erp/student/question-bank">Question Bank</NavLink>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
