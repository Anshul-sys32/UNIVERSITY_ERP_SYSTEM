import React, { useState, useEffect, useCallback } from "react";
import { adminRequest, getCurrentUser } from "../api/roleApi";

const initialForm = {
  ROLL_NUMBER: "",
  ADMISSION_NUMBER: "",
  FIRST_NAME: "",
  LAST_NAME: "",
  GENDER: "Male",
  DOB: "",
  EMAIL: "",
  PHONE_NUMBER: "",
  ADDRESS_PERMANENT: "",
  ADDRESS_CURRENT: "",
  PROGRAM_ID: "",
  DEPARTMENT_ID: "",
  BATCH_YEAR: "",
  CURRENT_SEMESTER: "",
  ADMISSION_DATE: "",
  PARENT_GUARDIAN_NAME: "",
  PARENT_GUARDIAN_PHONE: "",
  PHOTO_URL: "",
  USER_ID: "",
  STATUS: "ACTIVE",
};

const ManageStudents = () => {
  const adminUserId = getCurrentUser()?.user_id;
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [enrollment, setEnrollment] = useState({ rollNumber: "", courseId: "", academicYear: "" });
  const [message, setMessage] = useState("");
  const fetchStudents = useCallback(async () => {
    const data = await adminRequest("/students");
    setStudents(data);
  }, []);

  const fetchAcademicData = useCallback(async () => {
    const [courseData, registrationData] = await Promise.all([
      adminRequest(`/academic-data/${adminUserId}/courses`),
      adminRequest(`/academic-data/${adminUserId}/registrations`),
    ]);
    setCourses(courseData);
    setRegistrations(registrationData);
  }, [adminUserId]);

  useEffect(() => {
    Promise.all([fetchStudents(), fetchAcademicData()]).catch((error) => setMessage(error.message));
  }, [fetchStudents, fetchAcademicData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminRequest(editingId ? `/students/${editingId}` : "/students", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setMessage(editingId ? "Student updated." : "Student added.");
      await fetchStudents();
      setForm(initialForm);
      setEditingId(null);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleEdit = (student) => {
    setForm(student);
    setEditingId(student.STUDENT_ID);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await adminRequest(`/students/${id}`, { method: "DELETE" });
      await fetchStudents();
      setMessage("Student deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const assignCourse = async (event) => {
    event.preventDefault();
    try {
      await adminRequest(`/academic-data/${adminUserId}/registrations`, {
        method: "POST",
        body: JSON.stringify(enrollment),
      });
      setMessage("Student assigned to course.");
      setEnrollment({ ...enrollment, courseId: "" });
      await fetchAcademicData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateRegistration = async (registrationId, status) => {
    try {
      await adminRequest(`/academic-data/${adminUserId}/registrations/${registrationId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage("Registration status updated.");
      await fetchAcademicData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen p-6 text-white erp-gradient">
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-white/60">Admissions department</p>
      <h2 className="mb-2 text-2xl font-bold">Manage students</h2>
      <p className="mb-5 text-sm text-white/70">Create, update, and maintain student admission records in MySQL.</p>
      {message && <p className="mb-4 rounded-lg bg-white/15 px-4 py-3 text-sm">{message}</p>}

      <section className="erp-panel mb-6 p-5">
        <h3 className="text-xl font-semibold">Course assignment</h3>
        <p className="mt-1 text-sm text-white/70">Assign an active student to a course for the academic year.</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4" onSubmit={assignCourse}>
          <input className="erp-input" placeholder="Student roll number" value={enrollment.rollNumber} onChange={(event) => setEnrollment({ ...enrollment, rollNumber: event.target.value })} required />
          <select className="erp-input" value={enrollment.courseId} onChange={(event) => setEnrollment({ ...enrollment, courseId: event.target.value })} required>
            <option value="" className="text-black">Select course</option>
            {courses.filter((course) => course.IS_ACTIVE).map((course) => <option className="text-black" key={course.COURSE_ID} value={course.COURSE_ID}>{course.COURSE_CODE} · {course.TITLE} ({course.REGISTERED_COUNT || 0}/{course.CAPACITY})</option>)}
          </select>
          <input className="erp-input" placeholder="Academic year (2025-2026)" value={enrollment.academicYear} onChange={(event) => setEnrollment({ ...enrollment, academicYear: event.target.value })} required />
          <button className="erp-button" type="submit">Assign course</button>
        </form>
      </section>

      <form onSubmit={handleSubmit} className="erp-panel mb-6 grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        {Object.entries(initialForm).map(([key]) => (
          <div key={key}>
            <label className="block text-sm mb-1">{key.replace(/_/g, " ")}</label>
            <input
              name={key}
              type={key.includes("DATE") ? "date" : "text"}
              value={form[key]}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/20 px-3 py-2 text-black"
            />
          </div>
        ))}
        <div className="col-span-2 flex gap-4">
          <button type="submit" className="erp-button">
            {editingId ? "Update" : "Add"} Student
          </button>
          {editingId && (
            <button type="button" className="bg-gray-600 px-4 py-2 rounded" onClick={() => {
              setForm(initialForm);
              setEditingId(null);
            }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10">
      <table className="w-full min-w-[760px] text-sm text-white">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Roll</th>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Phone</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.STUDENT_ID}>
              <td className="border px-2 py-1">{s.STUDENT_ID}</td>
              <td className="border px-2 py-1">{s.ROLL_NUMBER}</td>
              <td className="border px-2 py-1">{s.FIRST_NAME} {s.LAST_NAME}</td>
              <td className="border px-2 py-1">{s.EMAIL}</td>
              <td className="border px-2 py-1">{s.PHONE_NUMBER}</td>
              <td className="border px-2 py-1">{s.STATUS}</td>
              <td className="border px-2 py-1 space-x-2">
                <button className="bg-yellow-500 px-2 rounded" onClick={() => handleEdit(s)}>Edit</button>
                <button className="bg-red-600 px-2 rounded" onClick={() => handleDelete(s.STUDENT_ID)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <section className="mt-6 erp-panel p-5">
        <h3 className="text-xl font-semibold">Course registrations</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm"><thead><tr>{["Student", "Course", "Academic year", "Registered", "Status"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{registrations.map((registration) => <tr className="border-t border-white/15" key={registration.REGISTRATION_ID}><td className="p-3">{registration.ROLL_NUMBER} · {registration.FIRST_NAME} {registration.LAST_NAME || ""}</td><td className="p-3">{registration.COURSE_CODE} · {registration.TITLE}</td><td className="p-3">{registration.ACADEMIC_YEAR}</td><td className="p-3">{new Date(registration.REGISTERED_AT).toLocaleDateString("en-IN")}</td><td className="p-3"><select className="rounded-lg bg-white px-2 py-1 text-xs text-slate-900" value={registration.STATUS} onChange={(event) => updateRegistration(registration.REGISTRATION_ID, event.target.value)}><option value="REGISTERED">Registered</option><option value="DROPPED">Dropped</option><option value="COMPLETED">Completed</option></select></td></tr>)}</tbody></table>{!registrations.length && <p className="mt-3 text-sm text-white/60">No course registrations yet.</p>}
        </div>
      </section>
    </div>
  );
};

export default ManageStudents;
