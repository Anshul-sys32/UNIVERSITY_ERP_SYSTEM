import { useEffect, useState } from "react";
import { fetchStudentResource } from "../api/studentApi";
import { apiRequest } from "../api/roleApi";
import { getStudentUserId } from "../api/studentApi";
import StudentDataState from "./StudentDataState";

const StudentExams = () => {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => Promise.all([
    fetchStudentResource("exams"),
    fetchStudentResource("exam-results"),
  ]).then(([examRows, resultRows]) => {
    setExams(examRows);
    setResults(resultRows);
  });

  useEffect(() => {
    let active = true;
    load().catch((loadError) => {
      if (active) setState({ loading: false, error: loadError.message });
    }).finally(() => {
      if (active) setState((current) => ({ ...current, loading: false }));
    });
    return () => { active = false; };
  }, []);

  const register = async (exam) => {
    const userId = getStudentUserId();
    setError("");
    setMessage("");
    try {
      const response = await apiRequest(`/student-data/${userId}/exams/${exam.EXAM_SESSION_ID}/register`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage(response.message);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="space-y-6 p-6">
      <header>
        <h2 className="text-3xl font-bold text-white">Examinations</h2>
        <p className="mt-2 text-sm text-white/70">Exam registration, schedule, and published results.</p>
      </header>
      {message && <p className="rounded-lg bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}
      {error && <p className="rounded-lg bg-red-300/15 p-4 text-sm text-red-100">{error}</p>}
      <StudentDataState {...state} empty={!exams.length && !results.length}>
        <section>
          <h3 className="mb-3 text-xl font-semibold text-white">Exam schedule</h3>
          <div className="divide-y divide-white/15 border-y border-white/15">
            {exams.map((exam) => (
              <article className="flex flex-wrap items-center justify-between gap-4 py-4 text-white" key={exam.EXAM_SESSION_ID}>
                <div>
                  <h4 className="font-semibold">{exam.COURSE_CODE} · {exam.COURSE_TITLE}</h4>
                  <p className="mt-1 text-sm text-white/65">{exam.EXAM_TYPE} · {exam.EXAM_DATE} · {String(exam.START_TIME).slice(0, 5)}-{String(exam.END_TIME).slice(0, 5)}</p>
                  <p className="mt-1 text-xs text-white/55">{exam.VENUE || "Venue not announced"} · Register by {exam.REGISTRATION_DEADLINE}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/70">{exam.REGISTRATION_STATUS || exam.EXAM_STATUS}</span>
                  {exam.EXAM_STATUS === "OPEN" && exam.REGISTRATION_STATUS !== "REGISTERED" && <button className="erp-button px-3 py-2 text-xs" onClick={() => register(exam)} type="button">Register</button>}
                </div>
              </article>
            ))}
            {!exams.length && <p className="py-4 text-sm text-white/60">No exam sessions are available for your registered courses.</p>}
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-xl font-semibold text-white">Published results</h3>
          <div className="divide-y divide-white/15 border-y border-white/15">
            {results.map((result) => (
              <article className="flex flex-wrap items-center justify-between gap-3 py-4 text-white" key={`${result.EXAM_CODE}:${result.COURSE_CODE}`}>
                <div><h4 className="font-semibold">{result.COURSE_CODE} · {result.COURSE_TITLE}</h4><p className="text-sm text-white/65">{result.EXAM_TYPE} · {result.EXAM_DATE}</p></div>
                <strong>{result.SCORE} / {result.MAX_SCORE}</strong>
              </article>
            ))}
            {!results.length && <p className="py-4 text-sm text-white/60">No exam results have been published.</p>}
          </div>
        </section>
      </StudentDataState>
    </section>
  );
};

export default StudentExams;