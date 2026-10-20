import { useEffect, useState } from "react";
import { facultyRequest } from "../api/roleApi";

const FacultyAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", studentId: "" });
  const [state, setState] = useState({ loading: true, error: "", message: "" });

  const loadAssignments = async () => {
    try {
      setAssignments(await facultyRequest("/assignments"));
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    } finally {
      setState((current) => ({ ...current, loading: false }));
    }
  };

  useEffect(() => { loadAssignments(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setState({ loading: false, error: "", message: "" });
    try {
      const data = await facultyRequest("/assignments", { method: "POST", body: JSON.stringify(form) });
      setState({ loading: false, error: "", message: data.message });
      setForm({ title: "", description: "", dueDate: "", studentId: "" });
      await loadAssignments();
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
    }
  };

  const deleteAssignment = async (id) => {
    try {
      await facultyRequest(`/assignments/${id}`, { method: "DELETE" });
      await loadAssignments();
    } catch (error) {
      setState((current) => ({ ...current, error: error.message }));
    }
  };

  return (
    <section className="space-y-6">
      <div><h2 className="text-3xl font-bold">Assignments</h2><p className="mt-2 text-sm text-white/70">Create work for a student and track what you have published.</p></div>
      <form className="erp-panel grid gap-4 p-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <input className="erp-input" placeholder="Assignment title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
        <input className="erp-input" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} required />
        <input className="erp-input" type="number" min="1" placeholder="Student ID" value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} required />
        <textarea className="erp-input md:col-span-2" placeholder="Instructions" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <div className="md:col-span-2"><button className="erp-button" type="submit">Publish assignment</button></div>
      </form>
      {state.message && <p className="rounded-xl bg-green-300/15 p-4 text-sm text-green-100">{state.message}</p>}
      {state.error && <p className="rounded-xl bg-yellow-300/15 p-4 text-sm text-yellow-100">{state.error}</p>}
      {state.loading ? <p className="text-white/70">Loading assignments…</p> : assignments.length ? <div className="grid gap-4 md:grid-cols-2">{assignments.map((assignment) => <article className="erp-panel p-5" key={assignment.ASSIGNMENT_ID}><div className="flex justify-between gap-4"><h3 className="font-semibold">{assignment.TITLE}</h3><span className="text-xs text-white/60">{assignment.STATUS}</span></div><p className="mt-3 text-sm text-white/70">{assignment.DESCRIPTION}</p><p className="mt-3 text-xs text-white/60">Due {assignment.DUE_DATE}</p><button className="mt-4 text-sm text-red-200 hover:text-white" onClick={() => deleteAssignment(assignment.ASSIGNMENT_ID)} type="button">Delete</button></article>)}</div> : <p className="erp-panel p-5 text-white/70">No assignments published yet.</p>}
    </section>
  );
};

export default FacultyAssignments;
