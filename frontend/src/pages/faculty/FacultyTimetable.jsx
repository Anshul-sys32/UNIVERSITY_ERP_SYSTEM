import { useEffect, useState } from "react";
import { facultyRequest } from "../../api/roleApi";

const FacultyTimetable = () => {
  const [slots, setSlots] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    facultyRequest("/timetable")
      .then(setSlots)
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Teaching timetable</h2>
        <p className="mt-2 text-sm text-white/70">Your assigned course schedule fetched from the server.</p>
      </div>
      {state.loading && <p className="rounded-2xl bg-white/10 p-6 text-white/75">Loading timetable…</p>}
      {state.error && <p className="rounded-2xl border border-yellow-200/30 bg-yellow-200/10 p-6 text-yellow-100">{state.error}</p>}
      {!state.loading && !state.error && (
        <div className="erp-panel overflow-x-auto p-5 text-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead><tr>{["Day", "Time", "Course", "Semester", "Room"].map((heading) => <th className="p-3" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{slots.map((slot) => <tr className="border-t border-white/15" key={slot.SLOT_ID}>
              <td className="p-3">{slot.DAY_OF_WEEK}</td>
              <td className="p-3">{String(slot.START_TIME).slice(0, 5)} - {String(slot.END_TIME).slice(0, 5)}</td>
              <td className="p-3">{slot.COURSE_CODE} · {slot.TITLE}</td>
              <td className="p-3">{slot.SEMESTER || "—"}</td>
              <td className="p-3">{slot.ROOM || "—"}</td>
            </tr>)}</tbody>
          </table>
          {!slots.length && <p className="text-sm text-white/60">No timetable slots have been published for your courses.</p>}
        </div>
      )}
    </section>
  );
};

export default FacultyTimetable;
