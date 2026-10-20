import React, { useState } from "react";

const FacultyAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const addAssignment = () => {
    if (title.trim() && description.trim()) {
      setAssignments([...assignments, { title, description }]);
      setTitle("");
      setDescription("");
    }
  };

  const deleteAssignment = (index) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg w-full">
      <h1 className="text-2xl font-bold mb-4">Faculty Assignments</h1>
      
      {/* Assignment Input Fields */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Assignment Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-2"
        />
        <textarea
          placeholder="Assignment Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <button onClick={addAssignment} className="bg-green-500 text-white px-4 py-2 mt-2 rounded">
          Add Assignment
        </button>
      </div>

      {/* Display Assignments */}
      <ul className="space-y-2">
        {assignments.map((assignment, index) => (
          <li key={index} className="flex justify-between bg-gray-100 p-2 rounded">
            <div>
              <h3 className="font-bold">{assignment.title}</h3>
              <p>{assignment.description}</p>
            </div>
            <button onClick={() => deleteAssignment(index)} className="text-red-500">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FacultyAssignments;
