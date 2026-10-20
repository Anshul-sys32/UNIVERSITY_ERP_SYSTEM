import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import DashboardConfigEditor from "./components/DashboardConfigEditor";
import ManageStudents from "./components/ManageStudents"; // Optional if direct route needed
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signin" element={<UserForm />} />

        {/* Student Dashboard + Nested Routes */}
        <Route path="/erp/student" element={<StudentDashboard />}>
          <Route path="assignments" element={<Assignments />} />
          <Route path="fees" element={<FeeDetails />} />
          <Route path="library" element={<LibraryDetails />} />
          <Route path="events" element={<EventsPlacement />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="results" element={<Result />} />
          <Route path="feedback" element={<Feedback />} />
        </Route>

        {/* Faculty Dashboard + Nested Routes */}
        <Route path="/erp/faculty" element={<FacultyDashboard />}>
          <Route path="assignments" element={<FacultyAssignments />} />
          <Route path="question-bank" element={<FacultyQuestionBank />} />
        </Route>

        {/* Employee Dashboard */}
        <Route path="/erp/employee" element={<EmployeeDashboard />} />

        {/* Dashboard Config Editor (Dynamic) */}
        <Route path="/dashboard-config/:type" element={<DashboardConfigEditor />} />

        {/* (Optional) Direct route for manage students */}
        <Route path="/faculty/manage-students" element={<ManageStudents />} />
      </Routes>
    </Router>
  );
}

export default App;
