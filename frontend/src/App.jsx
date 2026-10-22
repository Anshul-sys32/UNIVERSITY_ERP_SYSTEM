import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import DashboardConfigEditor from "./components/DashboardConfigEditor";
import ManageStudents from "./components/ManageStudents";
import Login from "./components/Login";
import UserForm from "./components/UserForm";
import StudentDashboard from "./components/StudentDashboard";
import FacultyDashboard from "./components/FacultyDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";

import Assignments from "./components/Assignments";
import FeeDetails from "./components/FeeDetails";
import LibraryDetails from "./components/LibraryDetails";
import EventsPlacement from "./components/EventsPlacement";
import QuestionBank from "./components/QuestionBank";
import FacultyAssignments from "./components/FacultyAssignments";
import FacultyQuestionBank from "./components/FacultyQuestionBank";
import Result from "./components/Result";
import Feedback from "./components/Feedback";
import FormGenerator from "./components/FormGenerator";
import Accounting from "./components/Accounting";
import LibraryManagement from "./components/LibraryManagement";
import PlacementManagement from "./components/PlacementManagement";
import StudentAcademics from "./components/StudentAcademics";
import StudentProfile from "./components/StudentProfile";
import StudentExams from "./components/StudentExams";
import AdminExamManagement from "./components/AdminExamManagement";
import StudentWallet from "./components/StudentWallet";
import FacultyRewards from "./components/FacultyRewards";
import WalletAdministration from "./components/WalletAdministration";
import MerchantDashboard from "./components/MerchantDashboard";
import Notifications from "./components/Notifications";
import AdminReports from "./components/AdminReports";
import StudentCampusServices from "./components/StudentCampusServices";
import CampusAdministration from "./components/CampusAdministration";
import FacultyAttendance from "./components/FacultyAttendance";
import FacultyTimetable from "./components/FacultyTimetable";
import AcademicCourseManagement from "./components/AcademicCourseManagement";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signin" element={<UserForm />} />

        <Route element={<ProtectedRoute roles={["STUDENT", "FACULTY", "EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT", "MERCHANT"]} />}>
          <Route path="/erp/notifications" element={<Notifications />} />
        </Route>

        {/* Student Dashboard + Nested Routes */}
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
            <Route path="campus-services" element={<StudentCampusServices />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="academics" element={<StudentAcademics />} />
          </Route>
        </Route>

        {/* Faculty Dashboard + Nested Routes */}
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

        {/* Employee Dashboard */}
        <Route element={<ProtectedRoute roles={["EMPLOYEE", "ADMIN", "LIBRARIAN", "ACCOUNTANT"]} />}>
          <Route path="/erp/employee" element={<EmployeeDashboard />} />
          <Route path="/dashboard-config/:type" element={<DashboardConfigEditor />} />
        </Route>

        <Route element={<ProtectedRoute roles={["ADMIN", "ACCOUNTANT"]} />}>
          <Route path="/erp/employee/accounting" element={<Accounting />} />
        </Route>
        <Route element={<ProtectedRoute roles={["ADMIN", "LIBRARIAN"]} />}>
          <Route path="/erp/employee/library" element={<LibraryManagement />} />
        </Route>
        <Route element={<ProtectedRoute roles={["ADMIN", "EMPLOYEE"]} />}>
          <Route path="/erp/employee/placements" element={<PlacementManagement />} />
        </Route>
        <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
          <Route path="/erp/admin/admissions" element={<ManageStudents />} />
          <Route path="/erp/admin/students" element={<ManageStudents />} />
          <Route path="/erp/admin/academics/courses" element={<AcademicCourseManagement />} />
          <Route path="/erp/admin/exams" element={<AdminExamManagement />} />
          <Route path="/erp/admin/wallet" element={<WalletAdministration />} />
          <Route path="/erp/admin/reports" element={<AdminReports />} />
          <Route path="/erp/admin/campus" element={<CampusAdministration />} />
        </Route>
        <Route element={<ProtectedRoute roles={["MERCHANT"]} />}>
          <Route path="/erp/merchant" element={<MerchantDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
