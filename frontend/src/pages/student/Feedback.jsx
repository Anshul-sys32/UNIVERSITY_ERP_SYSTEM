import { useState } from "react";
import { submitStudentFeedback } from "../../api/studentApi";

const Feedback = () => {
  const [form, setForm] = useState({ subject: "", message: "" });
  const [state, setState] = useState({ submitting: false, message: "", error: "" });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ submitting: true, message: "", error: "" });
    try {
      const data = await submitStudentFeedback(form);
      setState({ submitting: false, message: data.message, error: "" });
      setForm({ subject: "", message: "" });
    } catch (error) {
      setState({ submitting: false, message: "", error: error.message });
    }
  };

  return (
    <section className="p-6">
      <h2 className="mb-2 text-3xl font-bold text-white">Help & feedback</h2>
      <p className="mb-6 text-sm text-white/70">Send a message to the university support team.</p>
      <form className="erp-panel max-w-2xl space-y-5 p-6 text-white" onSubmit={handleSubmit}>
        <label className="block text-sm">Subject<input className="erp-input mt-2" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></label>
        <label className="block text-sm">Message<textarea className="erp-input mt-2 min-h-36" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></label>
        {state.message && <p className="rounded-lg bg-green-300/15 p-3 text-sm text-green-100">{state.message}</p>}
        {state.error && <p className="rounded-lg bg-yellow-300/15 p-3 text-sm text-yellow-100">{state.error}</p>}
        <button className="erp-button" disabled={state.submitting} type="submit">{state.submitting ? "Sending…" : "Submit feedback"}</button>
      </form>
    </section>
  );
};

export default Feedback;
