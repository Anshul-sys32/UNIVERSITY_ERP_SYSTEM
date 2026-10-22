import { useEffect, useState } from "react";
import { facultyRequest } from "../api/roleApi";

const FacultyRewards = () => {
  const [courses, setCourses] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ courseId: "", studentId: "", policyId: "", amount: "", reason: "", evidenceReference: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    Promise.all([facultyRequest("/courses"), facultyRequest("/reward-policies")])
      .then(([courseRows, policyRows]) => {
        setCourses(courseRows);
        setPolicies(policyRows);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  const chooseCourse = async (courseId) => {
    setForm({ ...form, courseId, studentId: "" });
    setStudents([]);
    if (!courseId) return;
    setLoadingStudents(true);
    try {
      const roster = await facultyRequest(`/attendance/${courseId}`);
      setStudents([...new Map(roster.map((student) => [student.STUDENT_ID, student])).values()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await facultyRequest("/reward-requests", { method: "POST", body: JSON.stringify(form) });
      setMessage(`${response.message} Request #${response.requestId}.`);
      setForm({ ...form, amount: "", reason: "", evidenceReference: "" });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="min-h-screen space-y-6 p-5 text-white erp-gradient sm:p-8">
      <header><p className="text-xs uppercase text-white/55">Student achievements</p><h1 className="mt-2 text-3xl font-bold">Reward request</h1><p className="mt-2 text-sm text-white/65">Requests are reviewed against the active policy and semester budget.</p></header>
      {message && <p className="rounded-lg bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
      {error && <p className="rounded-lg bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <form className="erp-panel grid gap-4 p-5 md:grid-cols-2" onSubmit={submit}>
        <label className="text-sm">Assigned course<select className="erp-input mt-2" required value={form.courseId} onChange={(event) => chooseCourse(event.target.value)}><option value="">Select course</option>{courses.map((course) => <option key={course.COURSE_ID} value={course.COURSE_ID}>{course.COURSE_CODE} · {course.TITLE}</option>)}</select></label>
        <label className="text-sm">Enrolled student<select className="erp-input mt-2" required disabled={!form.courseId || loadingStudents} value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">{loadingStudents ? "Loading roster…" : "Select student"}</option>{students.map((student) => <option key={student.STUDENT_ID} value={student.STUDENT_ID}>{student.ROLL_NUMBER || student.STUDENT_ID} · {student.FIRST_NAME} {student.LAST_NAME || ""}</option>)}</select></label>
        <label className="text-sm">Reward policy<select className="erp-input mt-2" required value={form.policyId} onChange={(event) => setForm({ ...form, policyId: event.target.value })}><option value="">Select policy</option>{policies.map((policy) => <option key={policy.POLICY_ID} value={policy.POLICY_ID}>{policy.POLICY_NAME} · {policy.PERIOD_CODE} (cap {policy.PER_STUDENT_CAP})</option>)}</select></label>
        <label className="text-sm">Requested credits<input className="erp-input mt-2" type="number" min="0.01" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
        <label className="text-sm md:col-span-2">Reason<textarea className="erp-input mt-2 min-h-24" required maxLength="240" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
        <label className="text-sm md:col-span-2">Evidence reference (optional)<input className="erp-input mt-2" maxLength="500" value={form.evidenceReference} onChange={(event) => setForm({ ...form, evidenceReference: event.target.value })} /></label>
        <button className="erp-button md:col-span-2 md:w-fit" type="submit">Submit for approval</button>
      </form>
    </section>
  );
};

export default FacultyRewards;