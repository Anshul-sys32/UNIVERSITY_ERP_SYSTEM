import { useCallback, useEffect, useState } from "react";
import { adminRequest, getCurrentUser } from "../api/roleApi";

const emptyCourse = {
  courseCode: "",
  title: "",
  credits: "",
  semester: "",
  department: "",
  courseType: "CORE",
  capacity: 60,
  facultyUserId: "",
};

const AcademicCourseManagement = () => {
  const adminUserId = getCurrentUser()?.user_id;
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCourse);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCourses = useCallback(async () => {
    setCourses(await adminRequest(`/academic-data/${adminUserId}/courses`));
  }, [adminUserId]);

  useEffect(() => {
    loadCourses().catch((requestError) => setError(requestError.message));
  }, [loadCourses]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const result = await adminRequest(`/academic-data/${adminUserId}/courses`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(result.message);
      setForm(emptyCourse);
      await loadCourses();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const assignFaculty = async (courseId, facultyUserId) => {
    if (!facultyUserId) return;
    try {
      const result = await adminRequest(`/academic-data/${adminUserId}/courses/${courseId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ facultyUserId }),
      });
      setMessage(result.message);
      await loadCourses();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="min-h-screen p-5 text-white erp-gradient sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Academic administration</p>
          <h1 className="mt-2 text-3xl font-bold">Course management</h1>
          <p className="mt-2 text-white/70">Create courses and assign them to active faculty members.</p>
        </header>
        <form className="erp-panel grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
          <input className="erp-input" placeholder="Course code" value={form.courseCode} onChange={(event) => setForm({ ...form, courseCode: event.target.value })} required />
          <input className="erp-input" placeholder="Course title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          <input className="erp-input" type="number" min="0.5" step="0.5" placeholder="Credits" value={form.credits} onChange={(event) => setForm({ ...form, credits: event.target.value })} required />
          <input className="erp-input" type="number" min="1" placeholder="Semester" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} required />
          <input className="erp-input" placeholder="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
          <select className="erp-input" value={form.courseType} onChange={(event) => setForm({ ...form, courseType: event.target.value })}><option className="text-black">CORE</option><option className="text-black">ELECTIVE</option><option className="text-black">OPEN_ELECTIVE</option></select>
          <input className="erp-input" type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} required />
          <input className="erp-input" type="number" min="1" placeholder="Faculty user ID (optional)" value={form.facultyUserId} onChange={(event) => setForm({ ...form, facultyUserId: event.target.value })} />
          <button className="erp-button lg:col-span-3 lg:w-fit" type="submit">Create course</button>
        </form>
        {message && <p className="mt-4 rounded-xl bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
        {error && <p className="mt-4 rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/20 bg-white/10">
          <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-white text-black"><tr>{["Code", "Course", "Semester", "Credits", "Faculty", "Registered", "Assign faculty"].map((heading) => <th className="p-4" key={heading}>{heading}</th>)}</tr></thead><tbody>{courses.map((course) => <tr className="border-t border-white/15" key={course.COURSE_ID}><td className="p-4 font-semibold">{course.COURSE_CODE}</td><td className="p-4">{course.TITLE}<span className="ml-2 text-xs text-white/50">{course.COURSE_TYPE}</span></td><td className="p-4">{course.SEMESTER}</td><td className="p-4">{course.CREDITS}</td><td className="p-4">{course.FIRST_NAME ? `${course.FIRST_NAME} ${course.LAST_NAME || ""}` : "Unassigned"}</td><td className="p-4">{course.REGISTERED_COUNT || 0}/{course.CAPACITY}</td><td className="p-4"><input className="w-36 rounded-lg bg-white px-2 py-2 text-xs text-slate-900" type="number" min="1" placeholder="Faculty user ID" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); assignFaculty(course.COURSE_ID, event.currentTarget.value); event.currentTarget.value = ""; } }} /></td></tr>)}</tbody></table>{!courses.length && <p className="p-6 text-sm text-white/60">No courses created yet.</p>}
        </div>
      </div>
    </section>
  );
};

export default AcademicCourseManagement;
