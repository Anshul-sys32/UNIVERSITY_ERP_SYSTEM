import { useState } from "react";
import { facultyRequest } from "../../api/roleApi";

const FormGenerator = () => {
  const [formTitle, setFormTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [message, setMessage] = useState("");

  const addQuestion = (type) => setQuestions([...questions, { id: Date.now(), type, question: "", options: [] }]);
  const updateQuestion = (id, value) => setQuestions(questions.map((question) => question.id === id ? { ...question, question: value } : question));
  const addOption = (id) => setQuestions(questions.map((question) => question.id === id ? { ...question, options: [...question.options, ""] } : question));
  const updateOption = (questionId, optionIndex, value) => setQuestions(questions.map((question) => question.id === questionId ? { ...question, options: question.options.map((item, index) => index === optionIndex ? value : item) } : question));
  const saveForm = async (status) => {
    try {
      const data = await facultyRequest("/forms", { method: "POST", body: JSON.stringify({ title: formTitle, questions, status }) });
      setMessage(data.message);
    } catch (error) { setMessage(error.message); }
  };

  return (
    <section className="erp-panel space-y-5 p-6">
      <div><h2 className="text-3xl font-bold">Form generator</h2><p className="mt-2 text-sm text-white/70">Create reusable forms and publish them when ready.</p></div>
      <input className="erp-input" value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder="Form title" />
      {questions.map((question, index) => <div className="rounded-xl border border-white/20 bg-black/10 p-4" key={question.id}><input className="erp-input" value={question.question} onChange={(event) => updateQuestion(question.id, event.target.value)} placeholder={`Question ${index + 1}`} />{question.type === "mcq" && <>{question.options.map((option, optionIndex) => <input className="erp-input mt-3" key={`${question.id}-${optionIndex}`} value={option} onChange={(event) => updateOption(question.id, optionIndex, event.target.value)} placeholder={`Option ${optionIndex + 1}`} />)}<button className="mt-3 text-sm text-white/70 hover:text-white" onClick={() => addOption(question.id)} type="button">+ Add option</button></>}</div>)}
      <div className="flex flex-wrap gap-3"><button className="erp-button" onClick={() => addQuestion("text")} type="button">+ Short answer</button><button className="erp-button" onClick={() => addQuestion("mcq")} type="button">+ Multiple choice</button><button className="rounded-xl border border-white/30 px-5 py-3 font-semibold hover:bg-white/15" disabled={!formTitle.trim()} onClick={() => saveForm("DRAFT")} type="button">Save draft</button><button className="rounded-xl bg-yellow-300 px-5 py-3 font-semibold text-slate-900 hover:bg-yellow-200" disabled={!formTitle.trim()} onClick={() => saveForm("PUBLISHED")} type="button">Publish</button></div>
      {message && <p className="rounded-lg bg-white/10 p-3 text-sm text-white/80">{message}</p>}
    </section>
  );
};

export default FormGenerator;
