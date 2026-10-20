import { useEffect, useState } from "react";
import { fetchStudentResource } from "../api/studentApi";
import StudentDataState from "./StudentDataState";

const QuestionBank = () => {
  const [papers, setPapers] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    fetchStudentResource("question-papers")
      .then(setPapers)
      .catch((error) => setState({ loading: false, error: error.message }))
      .finally(() => setState((current) => ({ ...current, loading: false })));
  }, []);

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Question bank</h2>
      <p className="mb-6 text-sm text-white/70">Find previous papers by subject and year.</p>
      <StudentDataState {...state} empty={!papers.length}>
        <div className="grid gap-5 sm:grid-cols-2">
          {papers.map((paper) => (
            <article className="erp-panel flex items-center justify-between gap-4 p-5 text-white" key={paper.PAPER_ID}>
              <div>
                <h3 className="font-semibold">{paper.SUBJECT}</h3>
                <p className="mt-1 text-sm text-white/65">Exam year: {paper.EXAM_YEAR}</p>
              </div>
              <a className="erp-button whitespace-nowrap text-sm" href={paper.DOWNLOAD_URL} target="_blank" rel="noreferrer">Download</a>
            </article>
          ))}
        </div>
      </StudentDataState>
    </section>
  );
};

export default QuestionBank;
