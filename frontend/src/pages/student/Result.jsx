import { useEffect, useState } from "react";
import { fetchStudentResource } from "../../api/studentApi";
import StudentDataState from "../../components/StudentDataState";

const Result = () => {
  const [results, setResults] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    fetchStudentResource("results")
      .then(setResults)
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Results</h2>
      <p className="mb-6 text-sm text-white/70">Review marks across semesters.</p>
      <StudentDataState {...state} empty={!results.length}>
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((result) => {
            const percentage = (Number(result.SCORE) / Number(result.MAX_SCORE || 100)) * 100;
            return (
              <article className="erp-panel p-5 text-white" key={result.RESULT_ID}>
                <div className="flex items-center justify-between gap-4">
                  <div><h3 className="font-semibold">{result.SUBJECT}</h3><p className="mt-1 text-sm text-white/60">Semester {result.SEMESTER || "—"}</p></div>
                  <strong className="text-2xl">{percentage.toFixed(1)}%</strong>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/15"><div className="h-2 rounded-full bg-white" style={{ width: `${Math.min(percentage, 100)}%` }} /></div>
                <p className="mt-2 text-sm text-white/65">{result.SCORE} / {result.MAX_SCORE}</p>
              </article>
            );
          })}
        </div>
      </StudentDataState>
    </section>
  );
};

export default Result;
