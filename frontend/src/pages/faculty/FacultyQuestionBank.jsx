import { useEffect, useState } from "react";
import { facultyRequest } from "../../api/roleApi";

const FacultyQuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ subject: "", questionText: "", questionType: "SHORT_ANSWER", options: [] });
  const [option, setOption] = useState("");
  const [error, setError] = useState("");

  const loadQuestions = async () => {
    try { setQuestions(await facultyRequest("/questions")); } catch (requestError) { setError(requestError.message); }
  };
  useEffect(() => { loadQuestions(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await facultyRequest("/questions", { method: "POST", body: JSON.stringify(form) });
      setForm({ subject: "", questionText: "", questionType: "SHORT_ANSWER", options: [] });
      await loadQuestions();
    } catch (requestError) { setError(requestError.message); }
  };

  const addOption = () => {
    if (option.trim()) {
      setForm({ ...form, options: [...form.options, option.trim()] });
      setOption("");
    }
  };

  const deleteQuestion = async (id) => {
    try { await facultyRequest(`/questions/${id}`, { method: "DELETE" }); await loadQuestions(); } catch (requestError) { setError(requestError.message); }
  };

  return (
    <section className="space-y-6">
      <div><h2 className="text-3xl font-bold">Question bank</h2><p className="mt-2 text-sm text-white/70">Build reusable questions for assessments.</p></div>
      <form className="erp-panel space-y-4 p-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2"><input className="erp-input" placeholder="Subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /><select className="erp-input" value={form.questionType} onChange={(event) => setForm({ ...form, questionType: event.target.value })}><option className="text-black" value="SHORT_ANSWER">Short answer</option><option className="text-black" value="MCQ">Multiple choice</option></select></div>
        <textarea className="erp-input" placeholder="Question text" value={form.questionText} onChange={(event) => setForm({ ...form, questionText: event.target.value })} required />
        {form.questionType === "MCQ" && <div className="flex gap-3"><input className="erp-input" placeholder="Add option" value={option} onChange={(event) => setOption(event.target.value)} /><button className="erp-button" onClick={addOption} type="button">Add option</button></div>}
        {form.options.length > 0 && <div className="flex flex-wrap gap-2">{form.options.map((value) => <span className="rounded-full bg-white/15 px-3 py-1 text-sm" key={value}>{value}</span>)}</div>}
        <button className="erp-button" type="submit">Save question</button>
      </form>
      {error && <p className="rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{error}</p>}
      {questions.length ? <div className="space-y-3">{questions.map((question) => <article className="erp-panel p-5" key={question.QUESTION_ID}><div className="flex justify-between gap-4"><span className="text-xs uppercase tracking-wider text-white/60">{question.SUBJECT}</span><button className="text-sm text-red-200" onClick={() => deleteQuestion(question.QUESTION_ID)} type="button">Delete</button></div><p className="mt-3">{question.QUESTION_TEXT}</p></article>)}</div> : <p className="erp-panel p-5 text-white/70">No questions saved yet.</p>}
    </section>
  );
};

export default FacultyQuestionBank;
