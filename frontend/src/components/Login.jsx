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
        <div
          onClick={() => handleSelection("faculty")}
          className="w-72 h-80 bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer hover:scale-105 transition-all duration-300"
        >
          <img src={FacultyIcon} alt="Faculty" className="w-20 h-20 mb-4" />
          <h2 className="text-3xl font-semibold">Faculty</h2>
        </div>

        {/* Student Card */}
        <div
          onClick={() => handleSelection("student")}
          className="w-72 h-80 bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer hover:scale-105 transition-all duration-300"
        >
          <img src={StudentIcon} alt="Student" className="w-20 h-20 mb-4" />
          <h2 className="text-3xl font-semibold">Student</h2>
        </div>

        {/* Employee Card */}
        <div
          onClick={() => handleSelection("employee")}
          className="w-72 h-80 bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer hover:scale-105 transition-all duration-300"
        >
          <img src={EmployeeIcon} alt="Employee" className="w-20 h-20 mb-4" />
          <h2 className="text-3xl font-semibold">Employee</h2>
        </div>
      </div>

      <Outlet />
    </>
  );
}

export default Login;
