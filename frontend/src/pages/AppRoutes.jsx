import { Route, Routes } from "react-router-dom";

import Login from "./auth/Login";
import UserForm from "./auth/UserForm";
import Notifications from "./shared/Notifications";
import ProtectedRoute from "./shared/ProtectedRoute";

import StudentDashboard from "./student/StudentDashboard";
import StudentProfile from "./student/StudentProfile";
import Assignments from "./student/Assignments";
import FeeDetails from "./student/FeeDetails";
import LibraryDetails from "./student/LibraryDetails";
import EventsPlacement from "./student/EventsPlacement";
import QuestionBank from "./student/QuestionBank";
import Result from "./student/Result";
import StudentExams from "./student/StudentExams";
import StudentWallet from "./student/StudentWallet";
import StudentCampusServices from "./student/StudentCampusServices";
import Feedback from "./student/Feedback";
import StudentAcademics from "./student/StudentAcademics";

import FacultyDashboard from "./faculty/FacultyDashboard";
import FormGenerator from "./faculty/FormGenerator";
import FacultyAssignments from "./faculty/FacultyAssignments";
import FacultyQuestionBank from "./faculty/FacultyQuestionBank";
import FacultyAttendance from "./faculty/FacultyAttendance";
import FacultyRewards from "./faculty/FacultyRewards";
import FacultyTimetable from "./faculty/FacultyTimetable";

import AdminPanelLayout from "./admin/AdminPanelLayout";
import ManageStudents from "./admin/ManageStudents";
import AcademicCourseManagement from "./admin/AcademicCourseManagement";
import AdminTimetableManagement from "./admin/AdminTimetableManagement";
import AdminExamManagement from "./admin/AdminExamManagement";
import WalletAdministration from "./admin/WalletAdministration";
import AdminReports from "./admin/AdminReports";
import AccessControlManager from "./admin/AccessControlManager";
import AdminDatabaseManager from "./admin/AdminDatabaseManager";
import CampusAdministration from "./admin/CampusAdministration";

import EmployeePortalLayout from "./staff/EmployeePortalLayout";
import EmployeeDashboard from "./staff/EmployeeDashboard";
import Accounting from "./staff/Accounting";
import LibraryManagement from "./staff/LibraryManagement";
import PlacementManagement from "./staff/PlacementManagement";
import DashboardConfigEditor from "./staff/DashboardConfigEditor";
import MerchantDashboard from "./merchant/MerchantDashboard";

const ALL_PORTAL_ROLES = ["STUDENT", "FACULTY", "EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT", "MERCHANT"];

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/signin" element={<UserForm />} />

    <Route element={<ProtectedRoute roles={ALL_PORTAL_ROLES} />}>
      <Route path="/erp/notifications" element={<Notifications />} />
    </Route>

    <Route element={<ProtectedRoute roles={["STUDENT"]} />}>
      <Route path="/erp/student" element={<StudentDashboard />}>
        <Route path="profile" element={<StudentProfile />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="fees" element={<FeeDetails />} />
        <Route path="library" element={<LibraryDetails />} />
        <Route path="events" element={<EventsPlacement />} />
        <Route path="question-bank" element={<QuestionBank />} />
        <Route path="results" element={<Result />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="wallet" element={<StudentWallet />} />
        <Route path="hostel" element={<StudentCampusServices section="hostel" />} />
        <Route path="research" element={<StudentCampusServices section="research" />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="academics" element={<StudentAcademics />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={["FACULTY"]} />}>
      <Route path="/erp/faculty" element={<FacultyDashboard />}>
        <Route path="form-generator" element={<FormGenerator />} />
        <Route path="assignments" element={<FacultyAssignments />} />
        <Route path="question-bank" element={<FacultyQuestionBank />} />
        <Route path="attendance" element={<FacultyAttendance />} />
        <Route path="rewards" element={<FacultyRewards />} />
        <Route path="timetable" element={<FacultyTimetable />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
      <Route path="/erp/admin" element={<AdminPanelLayout />}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="admissions" element={<ManageStudents />} />
        <Route path="students" element={<ManageStudents />} />
        <Route path="academics/courses" element={<AcademicCourseManagement />} />
        <Route path="timetables" element={<AdminTimetableManagement />} />
        <Route path="exams" element={<AdminExamManagement />} />
        <Route path="wallet" element={<WalletAdministration />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="access" element={<AccessControlManager />} />
        <Route path="data" element={<AdminDatabaseManager />} />
        <Route path="hostel" element={<CampusAdministration section="hostel" />} />
        <Route path="research" element={<CampusAdministration section="research" />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="library" element={<LibraryManagement />} />
        <Route path="placements" element={<PlacementManagement />} />
        <Route path="dashboard-config/:type" element={<DashboardConfigEditor />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute roles={["EMPLOYEE", "LIBRARIAN", "ACCOUNTANT"]} />}>
      <Route path="/erp/employee" element={<EmployeePortalLayout />}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="accounting" element={<Accounting />} />
        <Route path="library" element={<LibraryManagement />} />
        <Route path="placements" element={<PlacementManagement />} />
        <Route path="dashboard-config/:type" element={<DashboardConfigEditor />} />
      </Route>
      <Route path="/dashboard-config/:type" element={<DashboardConfigEditor />} />
    </Route>

    <Route element={<ProtectedRoute roles={["MERCHANT"]} />}>
      <Route path="/erp/merchant" element={<MerchantDashboard />} />
    </Route>
  </Routes>
);

export default AppRoutes;
