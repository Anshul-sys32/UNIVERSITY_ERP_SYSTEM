import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import FacultyIcon from "../assets/icons/teacher.png";
import StudentIcon from "../assets/icons/student.png";
import EmployeeIcon from "../assets/icons/staff.png";

function Login() {
  const navigate = useNavigate();

  const handleSelection = (selectedRole) => {
    navigate(`/signin?role=${selectedRole}`);
  };

  return (
    <>
      <div
        className="relative flex items-center justify-center h-screen gap-8 flex-wrap px-4"
        style={{
          background:
            "linear-gradient(300deg, rgba(67, 10, 199, 0.96), rgba(255, 35, 15, 0.95))",
        }}
      >
        {/* Faculty Card */}
        <div className="absolute left-6 top-6 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">University ERP</p>
          <h1 className="mt-2 text-2xl font-bold">One campus. One workspace.</h1>
        </div>
        <div
          onClick={() => handleSelection("faculty")}
          className="erp-panel flex h-80 w-72 cursor-pointer flex-col items-center justify-center text-white transition duration-300 hover:-translate-y-2 hover:bg-white/20"
        >
          <img src={FacultyIcon} alt="Faculty" className="w-20 h-20 mb-4" />
          <h2 className="text-2xl font-semibold">Faculty</h2>
          <p className="mt-2 text-sm text-white/70">Teach, assess and guide</p>
        </div>

        {/* Student Card */}
        <div
          onClick={() => handleSelection("student")}
          className="erp-panel flex h-80 w-72 cursor-pointer flex-col items-center justify-center text-white transition duration-300 hover:-translate-y-2 hover:bg-white/20"
        >
          <img src={StudentIcon} alt="Student" className="w-20 h-20 mb-4" />
          <h2 className="text-2xl font-semibold">Student</h2>
          <p className="mt-2 text-sm text-white/70">Learn, track and grow</p>
        </div>

        {/* Employee Card */}
        <div
          onClick={() => handleSelection("employee")}
          className="erp-panel flex h-80 w-72 cursor-pointer flex-col items-center justify-center text-white transition duration-300 hover:-translate-y-2 hover:bg-white/20"
        >
          <img src={EmployeeIcon} alt="Employee" className="w-20 h-20 mb-4" />
          <h2 className="text-2xl font-semibold">Employee</h2>
          <p className="mt-2 text-sm text-white/70">Operate the campus</p>
        </div>
      </div>

      <Outlet />
    </>
  );
}

export default Login;
