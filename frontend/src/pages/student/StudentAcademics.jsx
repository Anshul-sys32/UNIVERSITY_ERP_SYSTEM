import { useEffect, useState } from "react";
import { fetchStudentResource } from "../../api/studentApi";
import StudentDataState from "../../components/StudentDataState";

const StudentAcademics = () => {
  const [data, setData] = useState({ courses: [], timetable: [], attendance: [] });
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    Promise.all([
      fetchStudentResource("courses"),
      fetchStudentResource("timetable"),
      fetchStudentResource("attendance"),
    ]).then(([courses, timetable, attendance]) => setData({ courses, timetable, attendance }))
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="space-y-6 p-6">
      <div><h2 className="text-3xl font-bold text-white">Academic operations</h2><p className="mt-2 text-sm text-white/70">View registered courses, timetable, and subject attendance.</p></div>
      <StudentDataState {...state} empty={!data.courses.length && !data.timetable.length && !data.attendance.length}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="erp-panel p-5 text-white"><h3 className="mb-4 text-xl font-semibold">Registered courses</h3><div className="space-y-3">{data.courses.length ? data.courses.map((course) => <div className="flex justify-between gap-3 border-b border-white/15 pb-3 text-sm last:border-0" key={course.COURSE_ID}><span><b>{course.COURSE_CODE}</b> · {course.TITLE}<span className="block text-white/50">{course.CREDITS} credits · {course.COURSE_TYPE}</span></span><span>{course.ACADEMIC_YEAR}</span></div>) : <p className="text-sm text-white/60">No courses registered.</p>}</div></div>
          <div className="erp-panel p-5 text-white"><h3 className="mb-4 text-xl font-semibold">Attendance from server</h3><div className="space-y-3">{data.attendance.length ? data.attendance.map((item) => <div className="border-b border-white/15 pb-3 text-sm last:border-0" key={item.COURSE_ID}><div className="flex justify-between gap-3"><span>{item.COURSE_CODE} · {item.TITLE}</span><b className={Number(item.ATTENDANCE_PERCENT || 0) < 75 ? "text-yellow-200" : "text-green-300"}>{item.ATTENDANCE_PERCENT || 0}%</b></div><p className="mt-1 text-xs text-white/55">{item.ATTENDED_CLASSES || 0} of {item.TOTAL_CLASSES || 0} classes attended{item.LAST_CLASS_DATE ? ` · Last class ${item.LAST_CLASS_DATE}` : ""}</p></div>) : <p className="text-sm text-white/60">No attendance recorded on the server.</p>}</div></div>
        </div>
        <div className="erp-panel overflow-x-auto p-5 text-white"><h3 className="mb-4 text-xl font-semibold">Timetable</h3><table className="w-full min-w-[640px] text-left text-sm"><thead><tr>{["Day", "Time", "Course", "Room"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead><tbody>{data.timetable.map((slot) => <tr className="border-t border-white/15" key={slot.SLOT_ID}><td className="p-3">{slot.DAY_OF_WEEK}</td><td className="p-3">{String(slot.START_TIME).slice(0, 5)} - {String(slot.END_TIME).slice(0, 5)}</td><td className="p-3">{slot.COURSE_CODE} · {slot.TITLE}</td><td className="p-3">{slot.ROOM || "—"}</td></tr>)}</tbody></table>{!data.timetable.length && <p className="text-sm text-white/60">No timetable published.</p>}</div>
      </StudentDataState>
    </section>
  );
};

export default StudentAcademics;
