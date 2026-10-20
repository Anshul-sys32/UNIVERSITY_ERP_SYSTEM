// src/config/dashboardConfig.js

export const dashboardSettings = {
    student: {
      background: "linear-gradient(300deg, rgba(67,10,199,0.96), rgba(255,35,15,0.95))",
      sidebarItems: [
        { path: "/erp/student", label: "Dashboard" },
        { path: "/erp/student/assignments", label: "Assignments" },
        { path: "/erp/student/fees", label: "Fee Details" },
        { path: "/erp/student/library", label: "Library Details" },
        { path: "/erp/student/events", label: "Events / Placement" },
        { path: "/erp/student/question-bank", label: "Question Bank" },
        { path: "/erp/student/results", label: "All Results" },
        { path: "/erp/student/feedback", label: "Help / Feedback" },
      ],
    },
  
    faculty: {
      background: "linear-gradient(315deg, #0a30c7, #ff0f0f)",
      sidebarItems: [
        { path: "/erp/faculty", label: "Dashboard" },
        { path: "/erp/faculty/assignments", label: "Assignments" },
        { path: "/erp/faculty/question-bank", label: "Question Bank" },
        // You can add more items dynamically if needed
      ],
    },
  
    employee: {
      background: "linear-gradient(135deg, #00b09b, #96c93d)",
      sidebarItems: [
        { path: "/erp/employee", label: "Employee Dashboard" },
        // For employee dashboard you can customize later
      ],
    },
  };
  