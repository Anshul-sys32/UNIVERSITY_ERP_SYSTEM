import React, { useState, useEffect } from "react";

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

  const fetchStudents = async () => {
    const res = await fetch("http://localhost:5000/students");
    const data = await res.json();
    setStudents(data);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editingId
      ? `http://localhost:5000/students/${editingId}`
      : "http://localhost:5000/students";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      fetchStudents();
      setForm(initialForm);
      setEditingId(null);
    }
  };

  const handleEdit = (student) => {
    setForm(student);
    setEditingId(student.STUDENT_ID);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    await fetch(`http://localhost:5000/students/${id}`, {
      method: "DELETE",
    });
    fetchStudents();
  };

  return (
    <div className="p-6 text-white" style={{ background: "linear-gradient(300deg, #0a30c7, #ff0f0f)" }}>
      <h2 className="text-2xl font-bold mb-4">Manage Students</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 bg-white/10 p-4 rounded-md mb-6">
        {Object.entries(initialForm).map(([key]) => (
          <div key={key}>
            <label className="block text-sm mb-1">{key.replace(/_/g, " ")}</label>
            <input
              name={key}
              type={key.includes("DATE") ? "date" : "text"}
              value={form[key]}
              onChange={handleChange}
              className="w-full px-2 py-1 text-black rounded"
            />
          </div>
        ))}
        <div className="col-span-2 flex gap-4">
          <button type="submit" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-800">
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

      <table className="w-full text-sm bg-white/10 text-white rounded-md">
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
  );
};

export default ManageStudents;
