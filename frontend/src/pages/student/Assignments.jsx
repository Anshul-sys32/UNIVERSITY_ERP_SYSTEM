import { useEffect, useState } from "react";
import { fetchStudentResource, formatDate } from "../../api/studentApi";
import StudentDataState from "../../components/StudentDataState";

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    fetchStudentResource("assignments")
      .then((data) => setAssignments(data))
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Assignments</h2>
      <p className="mb-6 text-sm text-white/70">Keep track of upcoming academic work.</p>
      <StudentDataState {...state} empty={!assignments.length}>
        {selected ? (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <button onClick={() => setSelected(null)} className="text-left text-sm text-white/70 hover:text-white lg:col-span-2">
              ← Back to assignments
            </button>
            <article className="erp-panel p-6 text-white">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="text-2xl font-bold">{selected.TITLE}</h3>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs">{selected.STATUS}</span>
              </div>
              <p className="text-sm text-white/70">Due {formatDate(selected.DUE_DATE)}</p>
              <p className="mt-5 leading-7 text-white/85">{selected.DESCRIPTION || "No description provided."}</p>
            </article>
            <article className="erp-panel p-6 text-white">
              <h3 className="mb-4 text-lg font-semibold">Faculty details</h3>
              <p>{selected.FACULTY_NAME || "Not assigned"}</p>
              <p className="mt-2 text-sm text-white/70">{selected.FACULTY_EMAIL || "No contact information"}</p>
            </article>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => (
              <button
                key={assignment.ASSIGNMENT_ID}
                onClick={() => setSelected(assignment)}
                className="erp-panel p-5 text-left text-white transition-colors duration-150 hover:bg-white/20"
              >
                <div className="mb-8 flex items-start justify-between gap-3">
                  <span className="text-xs uppercase tracking-wider text-white/60">Assignment</span>
                  <span className="rounded-full bg-white/15 px-2 py-1 text-xs">{assignment.STATUS}</span>
                </div>
                <h3 className="text-lg font-semibold">{assignment.TITLE}</h3>
                <p className="mt-2 text-sm text-white/65">Due {formatDate(assignment.DUE_DATE)}</p>
              </button>
            ))}
          </div>
        )}
      </StudentDataState>
    </section>
  );
};

export default Assignments;
