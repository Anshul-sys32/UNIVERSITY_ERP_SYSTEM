import { useCallback, useEffect, useState } from "react";
import { adminRequest, getCurrentUser } from "../api/roleApi";
import StudentDataState from "./StudentDataState";

const initialForm = { courseId: "", examCode: "", examType: "Midterm", examDate: "", startTime: "09:00", endTime: "12:00", venue: "", maxScore: "100", registrationDeadline: "" };

const AdminExamManagement = () => {
  const userId = getCurrentUser()?.user_id;
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [marks, setMarks] = useState([]);
  const [scores, setScores] = useState({});
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ loading: true, error: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [courseRows, examRows] = await Promise.all([
      adminRequest(`/academic-data/${userId}/courses`),
      adminRequest(`/exam-admin/${userId}/sessions`),
    ]);
    setCourses(courseRows);
    setSessions(examRows);
  }, [userId]);

  useEffect(() => {
    load().catch((loadError) => setState({ loading: false, error: loadError.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, [load]);

  const selectSession = async (examSessionId) => {
    setSelectedSession(examSessionId);
    setMarks([]);
    if (!examSessionId) return;
    try {
      const rows = await adminRequest(`/exam-admin/${userId}/sessions/${examSessionId}/marks`);
      setMarks(rows);
      setScores(Object.fromEntries(rows.filter((row) => row.SCORE !== null).map((row) => [row.STUDENT_ID, String(row.SCORE)])));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const createSession = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await adminRequest(`/exam-admin/${userId}/sessions`, { method: "POST", body: JSON.stringify(form) });
      setMessage(response.message);
      setForm(initialForm);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const changeStatus = async (sessionId, status) => {
    try {
      const response = await adminRequest(`/exam-admin/${userId}/sessions/${sessionId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(response.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveMark = async (studentId) => {
    try {
      const response = await adminRequest(`/exam-admin/${userId}/sessions/${selectedSession}/students/${studentId}/marks`, {
        method: "PUT",
        body: JSON.stringify({ score: scores[studentId] }),
      });
      setMessage(response.message);
      await selectSession(selectedSession);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const publish = async () => {
    try {
      const response = await adminRequest(`/exam-admin/${userId}/sessions/${selectedSession}/publish`, { method: "POST", body: JSON.stringify({}) });
      setMessage(response.message);
      await load();
      await selectSession(selectedSession);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitMarks = async () => {
    try {
      const response = await adminRequest(`/exam-admin/${userId}/sessions/${selectedSession}/submit-marks`, { method: "POST", body: JSON.stringify({}) });
      setMessage(response.message);
      await load();
      await selectSession(selectedSession);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const approveMarks = async () => {
    try {
      const response = await adminRequest(`/exam-admin/${userId}/sessions/${selectedSession}/approve-marks`, { method: "POST", body: JSON.stringify({}) });
      setMessage(response.message);
      await load();
      await selectSession(selectedSession);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="min-h-screen space-y-8 p-5 text-white erp-gradient sm:p-8">
      <header><p className="text-xs uppercase text-white/55">Academic administration</p><h1 className="mt-2 text-3xl font-bold">Exam sessions</h1></header>
      {message && <p className="rounded-lg bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
      {error && <p className="rounded-lg bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <StudentDataState {...state}>
        <form className="erp-panel grid gap-3 p-5 md:grid-cols-3" onSubmit={createSession}>
          <h2 className="text-lg font-semibold md:col-span-3">Schedule an exam</h2>
          <select className="erp-input" required value={form.courseId} onChange={(event) => setForm({ ...form, courseId: event.target.value })}><option value="">Select course</option>{courses.filter((course) => course.IS_ACTIVE).map((course) => <option key={course.COURSE_ID} value={course.COURSE_ID}>{course.COURSE_CODE} · {course.TITLE}</option>)}</select>
          <input className="erp-input" placeholder="Exam code" required value={form.examCode} onChange={(event) => setForm({ ...form, examCode: event.target.value })} />
          <input className="erp-input" placeholder="Exam type" required value={form.examType} onChange={(event) => setForm({ ...form, examType: event.target.value })} />
          <label className="text-xs text-white/65">Exam date<input className="erp-input mt-1" type="date" required value={form.examDate} onChange={(event) => setForm({ ...form, examDate: event.target.value })} /></label>
          <label className="text-xs text-white/65">Start<input className="erp-input mt-1" type="time" required value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label className="text-xs text-white/65">End<input className="erp-input mt-1" type="time" required value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          <input className="erp-input" placeholder="Venue" value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} />
          <input className="erp-input" type="number" min="1" step="0.01" placeholder="Maximum score" required value={form.maxScore} onChange={(event) => setForm({ ...form, maxScore: event.target.value })} />
          <label className="text-xs text-white/65">Registration deadline<input className="erp-input mt-1" type="date" required value={form.registrationDeadline} onChange={(event) => setForm({ ...form, registrationDeadline: event.target.value })} /></label>
          <button className="erp-button md:col-span-3 md:w-fit" type="submit">Create draft session</button>
        </form>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Scheduled sessions</h2>
          <div className="divide-y divide-white/15 border-y border-white/15">{sessions.map((exam) => <article className="flex flex-wrap items-center justify-between gap-3 py-3" key={exam.EXAM_SESSION_ID}><div><strong>{exam.EXAM_CODE} · {exam.COURSE_CODE}</strong><p className="text-sm text-white/60">{exam.EXAM_DATE} · {exam.REGISTRATION_COUNT} registrations · {exam.MARK_COUNT} marks · {exam.STATUS}</p></div><div className="flex gap-2"><select aria-label={`Status for ${exam.EXAM_CODE}`} className="rounded bg-white px-2 py-2 text-sm text-black" disabled={exam.STATUS === "PUBLISHED"} value={exam.STATUS} onChange={(event) => changeStatus(exam.EXAM_SESSION_ID, event.target.value)}><option>DRAFT</option><option>OPEN</option><option>CLOSED</option><option>CANCELLED</option><option disabled>PUBLISHED</option></select><button className="erp-button px-3 py-2 text-xs" onClick={() => selectSession(String(exam.EXAM_SESSION_ID))} type="button">Enter marks</button></div></article>)}</div>
        </section>
        {selectedSession && <section className="erp-panel space-y-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Registered students and marks</h2><div className="flex flex-wrap gap-2"><button className="erp-button px-3 py-2 text-sm" onClick={submitMarks} type="button">Submit for moderation</button><button className="erp-button px-3 py-2 text-sm" onClick={approveMarks} type="button">Approve marks</button><button className="erp-button px-3 py-2 text-sm" onClick={publish} type="button">Publish results</button></div></div>{marks.map((row) => <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-3" key={row.STUDENT_ID}><p>{row.ROLL_NUMBER || row.STUDENT_ID} · {row.FIRST_NAME} {row.LAST_NAME || ""} · {row.STATUS || "No mark"}</p><div className="flex gap-2"><input aria-label={`Score for ${row.ROLL_NUMBER || row.STUDENT_ID}`} className="w-28 rounded px-2 py-2 text-black" disabled={row.STATUS && row.STATUS !== "DRAFT"} max={row.MAX_SCORE || 100} min="0" type="number" step="0.01" value={scores[row.STUDENT_ID] || ""} onChange={(event) => setScores({ ...scores, [row.STUDENT_ID]: event.target.value })} /><button className="erp-button px-3 py-2 text-xs" disabled={(row.STATUS && row.STATUS !== "DRAFT") || scores[row.STUDENT_ID] === undefined} onClick={() => saveMark(row.STUDENT_ID)} type="button">Save draft</button></div></div>)}</section>}
      </StudentDataState>
    </section>
  );
};

export default AdminExamManagement;