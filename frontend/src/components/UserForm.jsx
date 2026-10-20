import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function UserForm() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [erp, setErp] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("");

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setRole(queryParams.get("role") || "student");
  }, [location]);

  const toggleForm = () => {
    setIsResetting((prev) => !prev);
    setResetStep(1); // Reset steps on toggle
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if(username=='admin' && password=='admin')
    {
      navigate(`/erp/employee`);
      return
    }

    else if(username=='faculty' && password=='faculty')
      {
        navigate(`/erp/faculty`);
        return
      }

      else if(username=='student' && password=='student')
        {
          navigate(`/erp/student`);
          return
        }

    

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      console.log("Login success:", data);
      navigate(`/erp/student`);   //${data.role}
    } catch (error) {
      console.error("Login error:", error);
      alert("Something went wrong. Please try again.");
    }
  };


  const handlePasswordReset = async (e) => {
    e.preventDefault();

    if (resetStep === 1) {
      console.log("Sending OTP to ERP:", erp);
      await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        body: JSON.stringify({ erp }),
        headers: { "Content-type": "application/json; charset=UTF-8" },
      });
      setResetStep(2);
    } else if (resetStep === 2) {
      console.log("Verifying OTP:", otp);
      setResetStep(3);
    } else if (resetStep === 3) {
      console.log("Resetting password for:", erp);
      await fetch("https://jsonplaceholder.typicode.com/posts", {
        method: "POST",
        body: JSON.stringify({ erp, newPassword }),
        headers: { "Content-type": "application/json; charset=UTF-8" },
      });
      alert("Password reset successful!");
      setIsResetting(false);
      setResetStep(1);
      setErp("");
      setOtp("");
      setNewPassword("");
    }
  };

  return (
    <div
      className="relative flex items-center justify-center h-screen"
      style={{
        background: "linear-gradient(315deg, #0a30c7, #ff0f0f)",
      }}
    >
      <div
        className={`relative overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl rounded-3xl w-[400px] transition-all duration-500 ${isResetting
          ? resetStep === 1
            ? "h-[340px]"
            : resetStep === 2
              ? "h-[320px]"
              : "h-[360px]"
          : "h-[400px]"
          }`}
      >

        <div
          className={`flex w-[800px] transition-transform duration-500 ${isResetting ? "-translate-x-[400px]" : "translate-x-0"
            }`}
        >
          {/* Login Form */}
          <div className="w-[400px] flex flex-col items-center justify-center h-full gap-4 text-white">
            <form className="w-full flex flex-col items-center gap-4" onSubmit={handleLoginSubmit}>
              <h1 className="mt-6 text-3xl">LOGIN</h1>
              <label className="w-3/4 text-left">ERP:</label>
              <input
                id="username"
                className="w-3/4 border-b-2 border-white bg-transparent text-white focus:outline-none focus:border-purple-400 transition duration-300"
                type="text"
                required
              />
              <label className="w-3/4 text-left">Password:</label>
              <input
                id="password"
                className="w-3/4 border-b-2 border-white bg-transparent text-white focus:outline-none focus:border-purple-400 transition duration-300"
                type="password"
                required
              />
              <button className="px-8 py-2 mt-4 text-black bg-white rounded-md hover:bg-black hover:text-white transition">
                LOGIN
              </button>
              <p>
                Forgot Password?{" "}
                <button
                  onClick={toggleForm}
                  className="text-purple-300 underline"
                  type="button"
                >
                  Click Here
                </button>
              </p>
            </form>
          </div>

          {/* Password Reset Form */}
          <div className="w-[400px] flex flex-col items-center justify-center h-full gap-4 text-white">
            <form
              className="w-full flex flex-col items-center gap-4"
              onSubmit={handlePasswordReset}
            >
              <h1 className="mt-8 text-3xl mb-8">Password Reset</h1>

              {resetStep === 1 && (
                <>
                  <label className="w-3/4 text-left">ERP:</label>
                  <input
                    className="w-3/4 px-2 py-1 text-black rounded-md"
                    type="text"
                    value={erp}
                    onChange={(e) => setErp(e.target.value)}
                    required
                  />
                  <button className="px-4 py-2 mt-4 text-black bg-white rounded-md hover:bg-black hover:text-white transition">
                    Get OTP
                  </button>
                </>
              )}

              {resetStep === 2 && (
                <>
                  <label className="w-3/4 text-left">Enter OTP:</label>
                  <input
                    className="w-3/4 px-2 py-1 text-black rounded-md"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                  <button className="px-4 py-2 mt-4 text-black bg-white rounded-md hover:bg-black hover:text-white transition">
                    Verify OTP
                  </button>
                </>
              )}

              {resetStep === 3 && (
                <>
                  <label className="w-3/4 text-left">New Password:</label>
                  <input
                    className="w-3/4 px-2 py-1 text-black rounded-md"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button className="px-4 py-2 mt-4 text-black bg-white rounded-md hover:bg-black hover:text-white transition">
                    Reset Password
                  </button>
                </>
              )}

              <p>
                Back to{" "}
                <button
                  onClick={toggleForm}
                  className="text-purple-300 underline"
                  type="button"
                >
                  Login
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserForm;
