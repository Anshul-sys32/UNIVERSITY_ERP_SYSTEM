import { useEffect, useState } from "react";
import { facultyRequest } from "../../api/roleApi";

const FacultyAttendance = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    facultyRequest("/courses").then(setCourses).catch((requestError) => setError(requestError.message));
  }, []);

  const loadStudents = async (courseId) => {
    setSelectedCourse(courseId);
    if (!courseId) return setStudents([]);
    try {
      setStudents(await facultyRequest(`/attendance/${courseId}`));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const record = async (studentId, status) => {
    try {
      const result = await facultyRequest("/attendance", { method: "POST", body: JSON.stringify({ courseId: selectedCourse, studentId, lectureDate: date, status }) });
      setMessage(result.message);
      await loadStudents(selectedCourse);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="space-y-6 p-6"><div><h2 className="text-3xl font-bold text-white">Attendance</h2><p className="mt-2 text-sm text-white/70">Record attendance for your assigned courses.</p></div><div className="erp-panel grid gap-4 p-5 md:grid-cols-2"><select className="erp-input" value={selectedCourse} onChange={(event) => loadStudents(event.target.value)}><option value="" className="text-black">Select course</option>{courses.map((course) => <option className="text-black" key={course.COURSE_ID} value={course.COURSE_ID}>{course.COURSE_CODE} · {course.TITLE}</option>)}</select><input className="erp-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>{message && <p className="rounded-xl bg-green-300/15 p-4 text-sm text-green-100">{message}</p>}{error && <p className="rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}<div className="erp-panel overflow-x-auto p-5 text-white"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr>{["Student", "Roll number", "Latest status", "Mark attendance"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{students.map((student) => <tr className="border-t border-white/15" key={student.STUDENT_ID}><td className="p-3">{student.FIRST_NAME} {student.LAST_NAME || ""}</td><td className="p-3">{student.ROLL_NUMBER || "—"}</td><td className="p-3">{student.STATUS || "Not marked"}</td><td className="flex gap-2 p-3"><button className="rounded-lg bg-green-300/20 px-3 py-2 text-xs" onClick={() => record(student.STUDENT_ID, "PRESENT")} type="button">Present</button><button className="rounded-lg bg-red-300/20 px-3 py-2 text-xs" onClick={() => record(student.STUDENT_ID, "ABSENT")} type="button">Absent</button><button className="rounded-lg bg-yellow-300/20 px-3 py-2 text-xs" onClick={() => record(student.STUDENT_ID, "ON_DUTY")} type="button">On duty</button></td></tr>)}</tbody></table>{selectedCourse && !students.length && <p className="text-sm text-white/60">No students are registered for this course.</p>}</div></section>
  );
};

export default FacultyAttendance;
