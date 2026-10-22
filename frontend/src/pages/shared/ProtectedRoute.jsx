import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { loadCurrentUser } from "../../api/roleApi";

const ProtectedRoute = ({ roles }) => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const expired = () => {
      if (active) {
        setUser(null);
        setLoading(false);
      }
    };
    window.addEventListener("erp:session-expired", expired);
    loadCurrentUser()
      .then((authenticatedUser) => {
        if (active) setUser(authenticatedUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.removeEventListener("erp:session-expired", expired);
    };
  }, []);

  if (loading) return <main className="min-h-screen p-8 text-white erp-gradient">Checking your session…</main>;
  if (!user) return <Navigate to={`/signin?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === "STUDENT" ? "/erp/student" : user.role === "FACULTY" ? "/erp/faculty" : user.role === "ADMIN" ? "/erp/admin" : "/erp/employee"} replace />;
  return <Outlet />;
};

export default ProtectedRoute;
