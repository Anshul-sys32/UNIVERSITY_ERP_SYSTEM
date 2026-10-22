import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/roleApi";

const destinationByRole = {
  STUDENT: "/erp/student",
  FACULTY: "/erp/faculty",
  EMPLOYEE: "/erp/employee",
  ADMIN: "/erp/employee",
};

function UserForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const selectedRole = new URLSearchParams(location.search).get("role");
    setRole(selectedRole || "student");
  }, [location.search]);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await login(username, password);
      const selectedRole = role.toUpperCase();
      const employeeRoles = ["EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT"];
      const roleMatches = selectedRole === "EMPLOYEE"
        ? employeeRoles.includes(data.role)
        : data.role === selectedRole;
      if (!roleMatches) {
        setError(`This account is registered as ${data.role.toLowerCase()}, not ${role}.`);
        return;
      }
      navigate(destinationByRole[data.role] || "/erp/student");
    } catch (requestError) {
      console.error("Login error:", requestError);
      setError("Unable to reach the server. Check that the backend is running.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 erp-gradient">
      <section className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">{role} portal</p>
          <h1 className="mt-2 text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-white/70">Sign in to your university workspace.</p>
        </div>

        {!isResetting ? (
          <form className="space-y-5" onSubmit={handleLoginSubmit}>
            <label className="block text-sm">
              ERP username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="erp-input mt-2"
                type="text"
                autoComplete="username"
                required
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="erp-input mt-2"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="rounded-lg bg-yellow-300/20 p-3 text-sm text-yellow-100">{error}</p>}
            <button className="erp-button w-full" type="submit">Sign in</button>
            <button
              className="w-full text-sm text-white/70 transition hover:text-white"
              onClick={() => setIsResetting(true)}
              type="button"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-white/75">Password recovery is managed by your university administrator.</p>
            <button className="erp-button w-full" onClick={() => setIsResetting(false)} type="button">
              Back to sign in
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default UserForm;
