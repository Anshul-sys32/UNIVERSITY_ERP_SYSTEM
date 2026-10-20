import React, { useState, useEffect, useCallback } from "react";

const initialForm = {
  ROLL_NUMBER: "",
  ADMISSION_NUMBER: "",
  FIRST_NAME: "",
  LAST_NAME: "",
  GENDER: "Male",
  DOB: "",
  EMAIL: "",
  PHONE_NUMBER: "",
  ADDRESS_PERMANENT: "",
  ADDRESS_CURRENT: "",
  PROGRAM_ID: "",
  DEPARTMENT_ID: "",
  BATCH_YEAR: "",
  CURRENT_SEMESTER: "",
  ADMISSION_DATE: "",
  PARENT_GUARDIAN_NAME: "",
  PARENT_GUARDIAN_PHONE: "",
  PHOTO_URL: "",
  USER_ID: "",
  STATUS: "ACTIVE",
};

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchStudents = useCallback(async () => {
    const res = await fetch(`${apiUrl}/students`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Unable to load students.");
    setStudents(data);
  }, [apiUrl]);

  useEffect(() => {
    fetchStudents().catch((error) => setMessage(error.message));
  }, [fetchStudents]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId
      ? `${apiUrl}/students/${editingId}`
      : `${apiUrl}/students`;
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage(editingId ? "Student updated." : "Student added.");
      await fetchStudents();
      setForm(initialForm);
      setEditingId(null);
    } else {
      const data = await res.json();
      setMessage(data.message || "Unable to save student.");
    }
  };

  const handleEdit = (student) => {
    setForm(student);
    setEditingId(student.STUDENT_ID);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await fetch(`${apiUrl}/students/${id}`, {
      method: "DELETE",
    });
    await fetchStudents();
    setMessage("Student deleted.");
  };

  return (
    <div className="min-h-screen p-6 text-white erp-gradient">
      <h2 className="mb-2 text-2xl font-bold">Manage Students</h2>
      <p className="mb-5 text-sm text-white/70">Create and maintain student records in MySQL.</p>
      {message && <p className="mb-4 rounded-lg bg-white/15 px-4 py-3 text-sm">{message}</p>}

      <form onSubmit={handleSubmit} className="erp-panel mb-6 grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        {Object.entries(initialForm).map(([key]) => (
          <div key={key}>
            <label className="block text-sm mb-1">{key.replace(/_/g, " ")}</label>
            <input
              name={key}
              type={key.includes("DATE") ? "date" : "text"}
              value={form[key]}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/20 px-3 py-2 text-black"
            />
          </div>
        ))}
        <div className="col-span-2 flex gap-4">
          <button type="submit" className="erp-button">
            {editingId ? "Update" : "Add"} Student
          </button>
          {editingId && (
            <button type="button" className="bg-gray-600 px-4 py-2 rounded" onClick={() => {
              setForm(initialForm);
              setEditingId(null);
            }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/10">
      <table className="w-full min-w-[760px] text-sm text-white">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Roll</th>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Email</th>
            <th className="border px-2 py-1">Phone</th>
            <th className="border px-2 py-1">Status</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.STUDENT_ID}>
              <td className="border px-2 py-1">{s.STUDENT_ID}</td>
              <td className="border px-2 py-1">{s.ROLL_NUMBER}</td>
              <td className="border px-2 py-1">{s.FIRST_NAME} {s.LAST_NAME}</td>
              <td className="border px-2 py-1">{s.EMAIL}</td>
              <td className="border px-2 py-1">{s.PHONE_NUMBER}</td>
              <td className="border px-2 py-1">{s.STATUS}</td>
              <td className="border px-2 py-1 space-x-2">
                <button className="bg-yellow-500 px-2 rounded" onClick={() => handleEdit(s)}>Edit</button>
                <button className="bg-red-600 px-2 rounded" onClick={() => handleDelete(s.STUDENT_ID)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default ManageStudents;
