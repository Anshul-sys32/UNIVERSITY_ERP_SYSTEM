import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentUser } from "../api/roleApi";

const ProtectedRoute = ({ roles }) => {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) return <Navigate to={`/signin?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === "STUDENT" ? "/erp/student" : user.role === "FACULTY" ? "/erp/faculty" : "/erp/employee"} replace />;
  return <Outlet />;
};

export default ProtectedRoute;
